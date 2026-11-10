package fontpatch

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"cull-pear/internal/fontpatch"
)

// Called with r.mu held. Each application session unpacks one private runtime;
// failed/canceled extractions are never cached, and Reset/Close remove it.
func (r *Runner) ensureRuntime(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if r.executable != "" {
		return r.executable, nil
	}
	data, err := bundles.ReadFile(bundleName())
	if err != nil {
		return "", fontpatch.ErrUnavailable
	}
	root, err := os.MkdirTemp("", "dn-font-runtime-")
	if err != nil {
		return "", err
	}
	originalRoot := root
	success := false
	defer func() {
		if !success {
			os.RemoveAll(originalRoot)
		}
	}()
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return "", err
	}
	if err := unpack(ctx, data, root); err != nil {
		return "", err
	}
	name := "dn-font-patch"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	r.runtimeRoot, r.executable = root, filepath.Join(root, name)
	success = true
	return r.executable, nil
}

func (r *Runner) clearRuntime() error {
	if r.runtimeRoot != "" {
		if err := os.RemoveAll(r.runtimeRoot); err != nil {
			return err
		}
	}
	r.runtimeRoot, r.executable = "", ""
	return nil
}

func readSupportedCodepoints(ctx context.Context, path string) ([]int, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(&contextReader{ctx: ctx, reader: file}, (16<<20)+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 16<<20 {
		return nil, errors.New("字体字符映射超出限制")
	}
	var points []int
	if err := json.Unmarshal(data, &points); err != nil {
		return nil, errors.New("字体字符映射无效")
	}
	previous := -1
	for _, point := range points {
		if point <= previous || point > 0x10FFFF || (point >= 0xD800 && point <= 0xDFFF) {
			return nil, errors.New("字体字符映射无效")
		}
		previous = point
	}
	return points, nil
}

func validateCoverage(coverage fontpatch.GBKCoverage) error {
	if coverage.Total <= 0 || coverage.Total > 30000 || coverage.Covered < 0 || coverage.Missing < 0 || coverage.Covered+coverage.Missing != coverage.Total {
		return errors.New("字体覆盖检测结果不完整")
	}
	return nil
}
