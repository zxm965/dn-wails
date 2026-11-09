// Package fontpatch owns the local upload/build/export use case.
package fontpatch

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	ErrBusy        = errors.New("正在生成字体补丁，请等待完成")
	ErrUnavailable = errors.New("字体工具暂不可用，当前安装包缺少必要组件")
	ErrInvalidFont = errors.New("请选择一个 TTF 或静态 OTF 字体文件")
	ErrNoResult    = errors.New("补丁结果已失效，请重新上传字体")
)

type Result struct {
	ID                string `json:"id"`
	FontName          string `json:"fontName"`
	SourceName        string `json:"sourceName"`
	Filename          string `json:"filename"`
	PakBytes          int64  `json:"pakBytes"`
	ZipBytes          int64  `json:"zipBytes"`
	Converted         bool   `json:"converted"`
	MissingCharacters string `json:"missingCharacters"`
	GlyphCount        int    `json:"glyphCount"`
	SHA256            string `json:"sha256"`
	ContainerVerified bool   `json:"containerVerified"`
	GameVerified      bool   `json:"gameVerified"`
}

type Status struct {
	Available bool    `json:"available"`
	Busy      bool    `json:"busy"`
	Result    *Result `json:"result"`
	Error     string  `json:"error"`
}

type Platform interface {
	Available() bool
	Build(context.Context, string) (Result, error)
	Export(context.Context, string, string) error
	Reset() error
	Close() error
}

type Service struct {
	platform  Platform
	mu        sync.Mutex
	busy      bool
	closed    bool
	cancel    context.CancelFunc
	result    *Result
	lastError string
}

func NewService(platform Platform) *Service { return &Service{platform: platform} }

func (s *Service) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	var result *Result
	if s.result != nil {
		value := *s.result
		result = &value
	}
	return Status{Available: !s.closed && s.platform.Available(), Busy: s.busy, Result: result, Error: s.lastError}
}

func (s *Service) Build(ctx context.Context, source string) (Result, error) {
	source = strings.TrimSpace(source)
	ext := strings.ToLower(filepath.Ext(source))
	if !filepath.IsAbs(source) || (ext != ".ttf" && ext != ".otf") {
		return Result{}, ErrInvalidFont
	}
	s.mu.Lock()
	if s.closed || !s.platform.Available() {
		s.mu.Unlock()
		return Result{}, ErrUnavailable
	}
	if s.busy {
		s.mu.Unlock()
		return Result{}, ErrBusy
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	s.busy, s.cancel = true, cancel
	s.lastError = ""
	s.mu.Unlock()
	defer func() { cancel(); s.mu.Lock(); s.busy, s.cancel = false, nil; s.mu.Unlock() }()
	result, err := s.platform.Build(ctx, source)
	if err != nil {
		s.mu.Lock()
		s.lastError = err.Error()
		s.mu.Unlock()
		return Result{}, err
	}
	s.mu.Lock()
	s.result = &result
	s.mu.Unlock()
	return result, nil
}

func (s *Service) Export(ctx context.Context, id, destination string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed || s.result == nil || s.result.ID != id {
		return ErrNoResult
	}
	if s.busy {
		return ErrBusy
	}
	if !filepath.IsAbs(destination) || strings.ToLower(filepath.Ext(destination)) != ".zip" {
		return errors.New("请选择以 .zip 结尾的保存路径")
	}
	return s.platform.Export(ctx, id, destination)
}

func (s *Service) Cancel() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		s.cancel()
	}
}

// Reset removes only the session's temporary build, never an exported ZIP.
func (s *Service) Reset() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.busy {
		return ErrBusy
	}
	if s.closed {
		return ErrUnavailable
	}
	if err := s.platform.Reset(); err != nil {
		return err
	}
	s.result, s.lastError = nil, ""
	return nil
}

func (s *Service) Close() error {
	s.mu.Lock()
	s.closed = true
	if s.cancel != nil {
		s.cancel()
	}
	s.mu.Unlock()
	return s.platform.Close()
}
