package fontpatch

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"cull-pear/internal/fontpatch"
)

type Runner struct {
	mu             sync.Mutex
	root           string
	id             string
	zipPath        string
	fontPath       string
	fontSHA256     string
	fontCodepoints []int
	runtimeRoot    string
	executable     string
	draft          *draftState
	closed         bool
}

func New() *Runner { return &Runner{} }

func bundleName() string { return "runtime/" + runtime.GOOS + "-" + runtime.GOARCH + ".zip" }

func (r *Runner) Available() bool {
	f, err := bundles.Open(bundleName())
	if err != nil {
		return false
	}
	f.Close()
	return true
}

func (r *Runner) Build(ctx context.Context, source string) (fontpatch.Result, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.build(ctx, source, fontpatch.Options{ScalePercent: 100}, "")
}

func (r *Runner) build(ctx context.Context, source string, options fontpatch.Options, expectedSHA string) (fontpatch.Result, error) {
	if r.closed {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	executable, err := r.ensureRuntime(ctx)
	if err != nil {
		return fontpatch.Result{}, err
	}
	root, inputPath, err := newFontWorkspace(ctx, source)
	if err != nil {
		return fontpatch.Result{}, err
	}
	success := false
	defer func() {
		if !success {
			os.RemoveAll(root)
		}
	}()
	request, err := json.Marshal(struct {
		Source      string            `json:"source"`
		Output      string            `json:"output"`
		Options     fontpatch.Options `json:"options"`
		ExpectedSHA string            `json:"expectedSHA256"`
	}{inputPath, filepath.Join(root, "build"), options, expectedSHA})
	if err != nil {
		return fontpatch.Result{}, err
	}
	cmd := exec.CommandContext(ctx, executable)
	configureCommand(cmd)
	cmd.Dir = root
	cmd.Stdin = bytes.NewReader(request)
	stdout, stderr := &limitedBuffer{}, &limitedBuffer{}
	cmd.Stdout, cmd.Stderr = stdout, stderr
	runErr := cmd.Run()
	if ctx.Err() != nil {
		return fontpatch.Result{}, fmt.Errorf("字体生成已取消或超时：%w", ctx.Err())
	}
	var response struct {
		Result struct {
			fontpatch.Result
			PakPath string `json:"pakPath"`
			ZipPath string `json:"zipPath"`
		} `json:"result"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return fontpatch.Result{}, fmt.Errorf("字体工具未返回有效结果：%v", runErr)
	}
	if response.Error != "" {
		return fontpatch.Result{}, errors.New(response.Error)
	}
	if runErr != nil {
		return fontpatch.Result{}, fmt.Errorf("字体工具运行失败：%w", runErr)
	}
	result := response.Result.Result
	if !result.ContainerVerified || result.GameVerified || len(result.SHA256) != 64 || result.Filename != filepath.Base(result.Filename) {
		return fontpatch.Result{}, errors.New("字体工具校验结果不完整")
	}
	for _, path := range []string{response.Result.PakPath, response.Result.ZipPath} {
		rel, err := filepath.Rel(root, path)
		if err != nil || !filepath.IsLocal(rel) {
			return fontpatch.Result{}, errors.New("补丁输出路径不合法")
		}
		if info, err := os.Stat(path); err != nil || !info.Mode().IsRegular() {
			return fontpatch.Result{}, errors.New("补丁输出文件缺失")
		}
	}
	codepoints, err := readSupportedCodepoints(ctx, filepath.Join(root, "build", "coverage.json"))
	if err != nil {
		return fontpatch.Result{}, err
	}
	if err := validateCoverage(result.GBKCoverage); err != nil {
		return fontpatch.Result{}, err
	}
	if err := ctx.Err(); err != nil {
		return fontpatch.Result{}, err
	}
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		return fontpatch.Result{}, err
	}
	result.ID = hex.EncodeToString(id[:])
	fontPath := inputPath
	if result.Converted || result.Adjusted {
		fontPath = filepath.Join(filepath.Dir(response.Result.PakPath), "details", strings.TrimSuffix(result.Filename, ".pak")+".ttf")
	}
	if r.root != "" {
		if err := os.RemoveAll(r.root); err != nil {
			return fontpatch.Result{}, fmt.Errorf("清理上次补丁失败：%w", err)
		}
	}
	r.root, r.id, r.zipPath = root, result.ID, response.Result.ZipPath
	r.fontPath, r.fontSHA256 = fontPath, result.SHA256
	r.fontCodepoints = codepoints
	success = true
	return result, nil
}

func (r *Runner) Export(ctx context.Context, id, destination string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed || r.id == "" || id != r.id {
		return fontpatch.ErrNoResult
	}
	if err := copyFile(ctx, r.zipPath, destination, 128<<20); err != nil {
		if errors.Is(err, os.ErrExist) {
			return errors.New("保存位置已有同名文件，请使用其他名称")
		}
		return fmt.Errorf("保存补丁失败：%w", err)
	}
	return nil
}

func (r *Runner) Preview(ctx context.Context, id string) (fontpatch.Preview, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed || ((r.id == "" || id != r.id) && (r.draft == nil || r.draft.info.ID != id)) {
		return fontpatch.Preview{}, fontpatch.ErrNoResult
	}
	fontPath, fontSHA := r.fontPath, r.fontSHA256
	codepoints := r.fontCodepoints
	if r.draft != nil && id == r.draft.info.ID {
		fontPath, fontSHA = r.draft.fontPath, r.draft.info.SHA256
		codepoints = r.draft.codepoints
	}
	file, err := os.Open(fontPath)
	if err != nil {
		return fontpatch.Preview{}, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(&contextReader{ctx: ctx, reader: file}, 64<<20+1))
	if err != nil {
		return fontpatch.Preview{}, err
	}
	digest := sha256.Sum256(data)
	if len(data) > 64<<20 || hex.EncodeToString(digest[:]) != fontSHA {
		return fontpatch.Preview{}, errors.New("预览字体校验失败，请重新生成补丁")
	}
	return fontpatch.Preview{Data: base64.StdEncoding.EncodeToString(data), SupportedCodepoints: append([]int{}, codepoints...)}, nil
}

func (r *Runner) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.closed = true
	var err error
	if r.root != "" {
		err = os.RemoveAll(r.root)
	}
	if r.draft != nil {
		err = errors.Join(err, os.RemoveAll(r.draft.root))
	}
	return errors.Join(err, r.clearRuntime())
}

func (r *Runner) Reset() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return fontpatch.ErrUnavailable
	}
	if r.draft != nil {
		if err := os.RemoveAll(r.draft.root); err != nil {
			return err
		}
		r.draft = nil
	}
	if r.root != "" {
		if err := os.RemoveAll(r.root); err != nil {
			return fmt.Errorf("清理临时补丁失败：%w", err)
		}
	}
	r.root, r.id, r.zipPath = "", "", ""
	r.fontPath, r.fontSHA256 = "", ""
	r.fontCodepoints = nil
	return r.clearRuntime()
}

type limitedBuffer struct{ bytes.Buffer }

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if b.Len()+len(p) > 65536 {
		return 0, errors.New("字体工具输出超出限制")
	}
	return b.Buffer.Write(p)
}

func unpack(ctx context.Context, data []byte, directory string) error {
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}
	var total uint64
	files := make(map[string]*zip.File)
	var manifest *zip.File
	for _, file := range archive.File {
		if err := ctx.Err(); err != nil {
			return err
		}
		if !runtimePath(file.Name) || (!file.Mode().IsRegular() && !file.FileInfo().IsDir()) {
			return errors.New("字体工具包含不合法路径")
		}
		if file.UncompressedSize64 > 512<<20-total {
			return errors.New("字体工具大小超出限制")
		}
		total += file.UncompressedSize64
		if file.Name == "runtime-files.json" {
			if manifest != nil || !file.Mode().IsRegular() || file.UncompressedSize64 > 1<<20 {
				return errors.New("字体工具文件清单不合法")
			}
			manifest = file
			continue
		}
		path := filepath.Join(directory, file.Name)
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(path, 0700); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			return err
		}
		input, err := file.Open()
		if err != nil {
			return err
		}
		mode := os.FileMode(0600)
		if file.Mode()&0111 != 0 {
			mode = 0700
		}
		output, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
		if err != nil {
			input.Close()
			return err
		}
		_, copyErr := io.Copy(output, io.LimitReader(input, int64(file.UncompressedSize64)+1))
		closeErr := output.Close()
		input.Close()
		if err := errors.Join(copyErr, closeErr); err != nil {
			return err
		}
		files[file.Name] = file
	}
	if manifest == nil {
		return nil // Support existing bundles without deduplication metadata.
	}
	input, err := manifest.Open()
	if err != nil {
		return err
	}
	defer input.Close()
	payload, err := io.ReadAll(io.LimitReader(input, 1<<20+1))
	if err != nil {
		return err
	}
	var entries struct {
		Version    int `json:"version"`
		Duplicates []struct {
			Path   string `json:"path"`
			Source string `json:"source"`
		} `json:"duplicates"`
	}
	if len(payload) > 1<<20 || json.Unmarshal(payload, &entries) != nil || entries.Version != 1 {
		return errors.New("字体工具文件清单不合法")
	}
	for _, entry := range entries.Duplicates {
		if err := ctx.Err(); err != nil {
			return err
		}
		// Only an original regular ZIP entry can be a source: no external
		// paths, symbolic links, alias chains, or replacement of existing files.
		source, exists := files[entry.Source]
		if !exists || !runtimePath(entry.Source) || !runtimePath(entry.Path) || entry.Path == "runtime-files.json" {
			return errors.New("字体工具重复文件路径不合法")
		}
		if source.UncompressedSize64 > 512<<20-total {
			return errors.New("字体工具大小超出限制")
		}
		total += source.UncompressedSize64
		target := filepath.Join(directory, entry.Path)
		if err := os.MkdirAll(filepath.Dir(target), 0700); err != nil {
			return err
		}
		original := filepath.Join(directory, entry.Source)
		if err := os.Link(original, target); err != nil {
			// Filesystems without hard links still work; copyFile is exclusive.
			if err := copyFile(ctx, original, target, 512<<20); err != nil {
				return err
			}
			mode := os.FileMode(0600)
			if source.Mode()&0111 != 0 {
				mode = 0700
			}
			if err := os.Chmod(target, mode); err != nil {
				return err
			}
		}
	}
	return nil
}

func runtimePath(name string) bool {
	return filepath.IsLocal(name) && name != "." &&
		!strings.Contains(name, "\\") && !strings.Contains(name, ":") &&
		filepath.ToSlash(filepath.Clean(name)) == strings.TrimSuffix(name, "/")
}

func copyFile(ctx context.Context, source, destination string, limit int64) (err error) {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.OpenFile(destination, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, output.Close())
		if err != nil {
			os.Remove(destination)
		}
	}()
	reader := &contextReader{ctx: ctx, reader: input}
	n, err := io.Copy(output, io.LimitReader(reader, limit+1))
	if err != nil {
		return err
	}
	if n > limit {
		return errors.New("文件超出大小限制")
	}
	return output.Sync()
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r *contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}
