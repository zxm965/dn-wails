package fontpatch

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"embed"
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

//go:embed runtime/*
var bundles embed.FS

type Runner struct {
	mu      sync.Mutex
	root    string
	id      string
	zipPath string
	closed  bool
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
	if r.closed {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	info, err := os.Stat(source)
	if err != nil || !info.Mode().IsRegular() {
		return fontpatch.Result{}, fontpatch.ErrInvalidFont
	}
	if info.Size() > 64<<20 || info.Size() == 0 {
		return fontpatch.Result{}, errors.New("字体文件必须非空且不超过 64 MiB")
	}
	data, err := bundles.ReadFile(bundleName())
	if err != nil {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	root, err := os.MkdirTemp("", "dn-font-patch-")
	if err != nil {
		return fontpatch.Result{}, err
	}
	canonicalRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		os.RemoveAll(root)
		return fontpatch.Result{}, err
	}
	root = canonicalRoot
	success := false
	defer func() {
		if !success {
			os.RemoveAll(root)
		}
	}()
	runtimeDir := filepath.Join(root, "runtime")
	if err := unpack(ctx, data, runtimeDir); err != nil {
		return fontpatch.Result{}, fmt.Errorf("准备字体工具失败：%w", err)
	}
	executable := filepath.Join(runtimeDir, "dn-font-patch")
	if runtime.GOOS == "windows" {
		executable += ".exe"
	}
	// Snapshot the upload before conversion so subsequent source edits cannot
	// change what is inspected, packed and reported; never write the original.
	inputDir := filepath.Join(root, "input")
	if err := os.Mkdir(inputDir, 0700); err != nil {
		return fontpatch.Result{}, err
	}
	inputPath := filepath.Join(inputDir, filepath.Base(source))
	if err := copyFile(ctx, source, inputPath, 64<<20); err != nil {
		return fontpatch.Result{}, err
	}
	request, err := json.Marshal(struct {
		Source string `json:"source"`
		Output string `json:"output"`
	}{inputPath, filepath.Join(root, "build")})
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
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		return fontpatch.Result{}, err
	}
	result.ID = hex.EncodeToString(id[:])
	if r.root != "" {
		if err := os.RemoveAll(r.root); err != nil {
			return fontpatch.Result{}, fmt.Errorf("清理上次补丁失败：%w", err)
		}
	}
	r.root, r.id, r.zipPath = root, result.ID, response.Result.ZipPath
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

func (r *Runner) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.closed = true
	if r.root != "" {
		return os.RemoveAll(r.root)
	}
	return nil
}

func (r *Runner) Reset() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return fontpatch.ErrUnavailable
	}
	if r.root != "" {
		if err := os.RemoveAll(r.root); err != nil {
			return fmt.Errorf("清理临时补丁失败：%w", err)
		}
	}
	r.root, r.id, r.zipPath = "", "", ""
	return nil
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
	for _, file := range archive.File {
		if err := ctx.Err(); err != nil {
			return err
		}
		if !filepath.IsLocal(file.Name) || strings.Contains(file.Name, "\\") || strings.Contains(file.Name, ":") || file.Mode()&os.ModeSymlink != 0 {
			return errors.New("字体工具包含不合法路径")
		}
		total += file.UncompressedSize64
		if total > 512<<20 {
			return errors.New("字体工具大小超出限制")
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
	}
	return nil
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
