package fontpatch

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"cull-pear/internal/fontpatch"
)

type draftState struct {
	root, source, fontPath, outputRoot string
	codepoints                         []int
	info                               fontpatch.Draft
}

func newFontWorkspace(ctx context.Context, source string) (root, input string, err error) {
	info, err := os.Stat(source)
	if err != nil || !info.Mode().IsRegular() {
		return "", "", fontpatch.ErrInvalidFont
	}
	if info.Size() == 0 || info.Size() > 64<<20 {
		return "", "", errors.New("字体文件必须非空且不超过 64 MiB")
	}
	root, err = os.MkdirTemp("", "dn-font-patch-")
	if err != nil {
		return
	}
	originalRoot := root
	defer func() {
		if err != nil {
			os.RemoveAll(originalRoot)
		}
	}()
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return
	}
	inputDir := filepath.Join(root, "input")
	if err = os.Mkdir(inputDir, 0700); err != nil {
		return
	}
	input = filepath.Join(inputDir, filepath.Base(source))
	err = copyFile(ctx, source, input, 64<<20)
	return
}

func (r *Runner) Prepare(ctx context.Context, source string, options fontpatch.Options) (fontpatch.Draft, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.prepare(ctx, source, options, false)
}

func (r *Runner) Adjust(ctx context.Context, id string, options fontpatch.Options) (fontpatch.Draft, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.draft == nil || id != r.draft.info.ID {
		return fontpatch.Draft{}, fontpatch.ErrNoResult
	}
	// Always start from the immutable original, never from adjusted outlines.
	return r.prepare(ctx, r.draft.source, options, true)
}

func (r *Runner) prepare(ctx context.Context, source string, options fontpatch.Options, reuse bool) (fontpatch.Draft, error) {
	if r.closed {
		return fontpatch.Draft{}, fontpatch.ErrUnavailable
	}
	if err := options.Validate(); err != nil {
		return fontpatch.Draft{}, err
	}
	executable, err := r.ensureRuntime(ctx)
	if err != nil {
		return fontpatch.Draft{}, err
	}
	var root, input string
	if reuse {
		root, input = r.draft.root, r.draft.source
	} else {
		root, input, err = newFontWorkspace(ctx, source)
		if err != nil {
			return fontpatch.Draft{}, err
		}
	}
	success := false
	var outputRoot string
	defer func() {
		if !success {
			if reuse {
				os.RemoveAll(outputRoot)
			} else {
				os.RemoveAll(root)
			}
		}
	}()
	outputRoot, err = os.MkdirTemp(root, "preview-")
	if err != nil {
		return fontpatch.Draft{}, err
	}
	output := filepath.Join(outputRoot, "font")
	request, err := json.Marshal(struct {
		Action  string            `json:"action"`
		Source  string            `json:"source"`
		Output  string            `json:"output"`
		Options fontpatch.Options `json:"options"`
	}{"preview", input, output, options})
	if err != nil {
		return fontpatch.Draft{}, err
	}
	cmd := exec.CommandContext(ctx, executable)
	configureCommand(cmd)
	cmd.Dir, cmd.Stdin = root, bytes.NewReader(request)
	stdout, stderr := &limitedBuffer{}, &limitedBuffer{}
	cmd.Stdout, cmd.Stderr = stdout, stderr
	runErr := cmd.Run()
	if ctx.Err() != nil {
		return fontpatch.Draft{}, fmt.Errorf("字体预览已取消或超时：%w", ctx.Err())
	}
	var response struct {
		Result struct {
			fontpatch.Draft
			FontPath string `json:"fontPath"`
		} `json:"result"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return fontpatch.Draft{}, errors.New("字体工具未返回有效预览")
	}
	if response.Error != "" {
		return fontpatch.Draft{}, errors.New(response.Error)
	}
	if runErr != nil {
		return fontpatch.Draft{}, fmt.Errorf("字体预览失败：%w", runErr)
	}
	fontPath := filepath.Join(output, "preview.ttf")
	if response.Result.FontPath != fontPath || len(response.Result.SHA256) != 64 || response.Result.Options != options {
		return fontpatch.Draft{}, errors.New("字体工具预览结果不完整")
	}
	info, err := os.Lstat(fontPath)
	if err != nil || !info.Mode().IsRegular() || info.Size() == 0 || info.Size() > 64<<20 {
		return fontpatch.Draft{}, errors.New("预览字体文件不合法")
	}
	codepoints, err := readSupportedCodepoints(ctx, filepath.Join(output, "coverage.json"))
	if err != nil {
		return fontpatch.Draft{}, err
	}
	if err := validateCoverage(response.Result.GBKCoverage); err != nil {
		return fontpatch.Draft{}, err
	}
	if err := ctx.Err(); err != nil {
		return fontpatch.Draft{}, err
	}
	var id [16]byte
	if _, err := rand.Read(id[:]); err != nil {
		return fontpatch.Draft{}, err
	}
	draft := response.Result.Draft
	draft.ID = hex.EncodeToString(id[:])
	if r.draft != nil {
		oldRoot := r.draft.root
		if reuse {
			oldRoot = r.draft.outputRoot
		}
		if err := os.RemoveAll(oldRoot); err != nil {
			return fontpatch.Draft{}, err
		}
	}
	r.draft = &draftState{root: root, source: input, fontPath: fontPath, outputRoot: outputRoot, codepoints: codepoints, info: draft}
	success = true
	return draft, nil
}

func (r *Runner) Confirm(ctx context.Context, id string) (fontpatch.Result, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.draft == nil || id != r.draft.info.ID {
		return fontpatch.Result{}, fontpatch.ErrNoResult
	}
	result, err := r.build(ctx, r.draft.source, r.draft.info.Options, r.draft.info.SHA256)
	if err == nil {
		result.DraftID = id
	}
	return result, err
}
