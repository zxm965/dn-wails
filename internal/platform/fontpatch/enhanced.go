package fontpatch

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"cull-pear/internal/fontpatch"
)

type sourceState struct {
	root, path string
	info       fontpatch.SourceFont
	codepoints []int
}
type EnhancedRunner struct {
	*Runner
	fonts [2]*sourceState
}

func NewEnhanced() *EnhancedRunner { return &EnhancedRunner{Runner: New()} }
func newID() (string, error) {
	var id [16]byte
	_, err := rand.Read(id[:])
	return hex.EncodeToString(id[:]), err
}

// All worker operations run under Runner.mu, using the same private runtime.
func (r *EnhancedRunner) invoke(ctx context.Context, request any, response any) error {
	if r.closed {
		return fontpatch.ErrUnavailable
	}
	executable, err := r.ensureRuntime(ctx)
	if err != nil {
		return err
	}
	data, err := json.Marshal(request)
	if err != nil {
		return err
	}
	cmd := exec.CommandContext(ctx, executable)
	configureCommand(cmd)
	cmd.Stdin = bytes.NewReader(data)
	stdout, stderr := &limitedBuffer{}, &limitedBuffer{}
	cmd.Stdout, cmd.Stderr = stdout, stderr
	runErr := cmd.Run()
	if ctx.Err() != nil {
		return ctx.Err()
	}
	var envelope struct {
		Result json.RawMessage `json:"result"`
		Error  string          `json:"error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &envelope); err != nil {
		return errors.New("字体引擎未返回有效数据，请确认内置引擎已更新")
	}
	if envelope.Error != "" {
		return errors.New(envelope.Error)
	}
	if runErr != nil {
		return fmt.Errorf("字体处理失败：%w", runErr)
	}
	return json.Unmarshal(envelope.Result, response)
}
func (r *EnhancedRunner) ImportFont(ctx context.Context, slot int, path string) (fontpatch.SourceFont, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if slot < 0 || slot > 1 {
		return fontpatch.SourceFont{}, fontpatch.ErrInvalidFont
	}
	root, input, err := newFontWorkspace(ctx, path)
	if err != nil {
		return fontpatch.SourceFont{}, err
	}
	var info fontpatch.SourceFont
	output := filepath.Join(root, "font.ttf")
	err = r.invoke(ctx, struct {
		Action string `json:"action"`
		Source string `json:"source"`
		Output string `json:"output"`
	}{"import", input, output}, &info)
	if err != nil {
		os.RemoveAll(root)
		return info, err
	}
	info.Name = filepath.Base(path)
	info.Origin = "上传字体"
	return r.acceptSource(ctx, slot, root, output, info)
}
func (r *EnhancedRunner) acceptSource(ctx context.Context, slot int, root, path string, info fontpatch.SourceFont) (fontpatch.SourceFont, error) {
	success := false
	defer func() {
		if !success {
			os.RemoveAll(root)
		}
	}()
	codepoints, err := readSupportedCodepoints(ctx, filepath.Join(root, "coverage.json"))
	if err != nil {
		return info, err
	}
	if err = validateCoverage(info.GBKCoverage); err != nil {
		return info, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return info, err
	}
	sum := sha256.Sum256(data)
	if len(data) > 64<<20 || hex.EncodeToString(sum[:]) != info.SHA256 {
		return info, errors.New("导入字体校验失败")
	}
	info.ID, err = newID()
	if err != nil {
		return info, err
	}
	if err = ctx.Err(); err != nil {
		return info, err
	}
	if old := r.fonts[slot]; old != nil {
		if err = os.RemoveAll(old.root); err != nil {
			return info, err
		}
	}
	r.fonts[slot] = &sourceState{root: root, path: path, info: info, codepoints: codepoints}
	success = true
	return info, nil
}
func (r *EnhancedRunner) Compose(ctx context.Context, request fontpatch.CompositionRequest) (fontpatch.CompositionPreview, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if err := request.Validate(); err != nil {
		return fontpatch.CompositionPreview{}, err
	}
	a, b := r.fonts[0], r.fonts[1]
	if a == nil || b == nil || a.info.ID != request.FontAID || b.info.ID != request.FontBID {
		return fontpatch.CompositionPreview{}, fontpatch.ErrNoResult
	}
	root, err := os.MkdirTemp("", "dn-font-compose-")
	if err != nil {
		return fontpatch.CompositionPreview{}, err
	}
	defer os.RemoveAll(root)
	output := filepath.Join(root, "组合字体.ttf")
	var stats fontpatch.CompositionStats
	err = r.invoke(ctx, struct {
		Action           string            `json:"action"`
		Base             string            `json:"base"`
		Donor            string            `json:"donor"`
		Output           string            `json:"output"`
		ReplacementScope int               `json:"replacementScope"`
		AdjustmentScope  int               `json:"adjustmentScope"`
		Options          fontpatch.Options `json:"options"`
	}{"merge", a.path, b.path, output, request.ReplacementScope, request.AdjustmentScope, request.Options}, &stats)
	if err != nil {
		return fontpatch.CompositionPreview{}, err
	}
	draft, err := r.prepare(ctx, output, fontpatch.Options{ScalePercent: 100}, false)
	return fontpatch.CompositionPreview{Draft: draft, Stats: stats}, err
}
func (r *EnhancedRunner) SourcePreview(ctx context.Context, id string) (fontpatch.Preview, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return fontpatch.Preview{}, fontpatch.ErrUnavailable
	}
	for _, font := range r.fonts {
		if font != nil && font.info.ID == id {
			if err := ctx.Err(); err != nil {
				return fontpatch.Preview{}, err
			}
			data, err := os.ReadFile(font.path)
			if err != nil {
				return fontpatch.Preview{}, err
			}
			sum := sha256.Sum256(data)
			if len(data) > 64<<20 || hex.EncodeToString(sum[:]) != font.info.SHA256 {
				return fontpatch.Preview{}, errors.New("字体校验失败，请重新导入")
			}
			return fontpatch.Preview{Data: base64.StdEncoding.EncodeToString(data), SupportedCodepoints: append([]int{}, font.codepoints...)}, nil
		}
	}
	return fontpatch.Preview{}, fontpatch.ErrNoResult
}
func (r *EnhancedRunner) clearSources() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	var result error
	for slot, font := range r.fonts {
		if font != nil {
			err := os.RemoveAll(font.root)
			result = errors.Join(result, err)
			if err == nil {
				r.fonts[slot] = nil
			}
		}
	}
	return result
}
func (r *EnhancedRunner) Reset() error { return errors.Join(r.Runner.Reset(), r.clearSources()) }
func (r *EnhancedRunner) Close() error { return errors.Join(r.Runner.Close(), r.clearSources()) }
