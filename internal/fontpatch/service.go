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
	ErrBusy        = errors.New("正在处理字体，请等待完成")
	ErrUnavailable = errors.New("字体工具暂不可用，当前安装包缺少必要组件")
	ErrInvalidFont = errors.New("请选择一个 TTF 或静态 OTF 字体文件")
	ErrNoResult    = errors.New("补丁结果已失效，请重新上传字体")
)

type Result struct {
	ID                string  `json:"id"`
	FontName          string  `json:"fontName"`
	SourceName        string  `json:"sourceName"`
	Filename          string  `json:"filename"`
	PakBytes          int64   `json:"pakBytes"`
	ZipBytes          int64   `json:"zipBytes"`
	Converted         bool    `json:"converted"`
	MissingCharacters string  `json:"missingCharacters"`
	GlyphCount        int     `json:"glyphCount"`
	SHA256            string  `json:"sha256"`
	ContainerVerified bool    `json:"containerVerified"`
	GameVerified      bool    `json:"gameVerified"`
	Adjusted          bool    `json:"adjusted"`
	Options           Options `json:"options"`
	DraftID           string  `json:"draftId"`
}

type Options struct {
	ScalePercent int `json:"scalePercent"`
	Weight       int `json:"weight"`
}

func (o Options) Validate() error {
	if o.ScalePercent < 80 || o.ScalePercent > 125 || o.Weight < -2 || o.Weight > 6 {
		return errors.New("字形大小须在 80%–125%，笔画粗细须在 -2–6 档之间")
	}
	return nil
}

type Draft struct {
	ID                string  `json:"id"`
	FontName          string  `json:"fontName"`
	SourceName        string  `json:"sourceName"`
	Converted         bool    `json:"converted"`
	Adjusted          bool    `json:"adjusted"`
	MissingCharacters string  `json:"missingCharacters"`
	GlyphCount        int     `json:"glyphCount"`
	SHA256            string  `json:"sha256"`
	Options           Options `json:"options"`
}

type Status struct {
	Available bool    `json:"available"`
	Busy      bool    `json:"busy"`
	Result    *Result `json:"result"`
	Error     string  `json:"error"`
	Draft     *Draft  `json:"draft"`
	Phase     string  `json:"phase"`
}

type Preview struct {
	Data string `json:"data"`
}

type Platform interface {
	Available() bool
	Build(context.Context, string) (Result, error)
	Export(context.Context, string, string) error
	Preview(context.Context, string) (Preview, error)
	Prepare(context.Context, string, Options) (Draft, error)
	Adjust(context.Context, string, Options) (Draft, error)
	Confirm(context.Context, string) (Result, error)
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
	draft     *Draft
	phase     string
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
	var draft *Draft
	if s.draft != nil {
		value := *s.draft
		draft = &value
	}
	return Status{Available: !s.closed && s.platform.Available(), Busy: s.busy, Result: result, Error: s.lastError, Draft: draft, Phase: s.phase}
}

func (s *Service) begin(ctx context.Context, phase string) (context.Context, func(), error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed || !s.platform.Available() {
		return nil, nil, ErrUnavailable
	}
	if s.busy {
		return nil, nil, ErrBusy
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	s.busy, s.cancel, s.lastError = true, cancel, ""
	s.phase = phase
	return ctx, func() { cancel(); s.mu.Lock(); s.busy, s.cancel, s.phase = false, nil, ""; s.mu.Unlock() }, nil
}

func (s *Service) Prepare(ctx context.Context, source string, options Options) (Draft, error) {
	ext := strings.ToLower(filepath.Ext(source))
	if !filepath.IsAbs(source) || (ext != ".ttf" && ext != ".otf") {
		return Draft{}, ErrInvalidFont
	}
	return s.prepare(ctx, source, "", options)
}

func (s *Service) Adjust(ctx context.Context, id string, options Options) (Draft, error) {
	return s.prepare(ctx, "", id, options)
}

func (s *Service) prepare(ctx context.Context, source, id string, options Options) (Draft, error) {
	if err := options.Validate(); err != nil {
		return Draft{}, err
	}
	ctx, done, err := s.begin(ctx, "preview")
	if err != nil {
		return Draft{}, err
	}
	defer done()
	var draft Draft
	if source != "" {
		draft, err = s.platform.Prepare(ctx, source, options)
	} else {
		draft, err = s.platform.Adjust(ctx, id, options)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.lastError = err.Error()
		return Draft{}, err
	}
	s.draft = &draft
	return draft, nil
}

func (s *Service) Confirm(ctx context.Context, id string) (Result, error) {
	ctx, done, err := s.begin(ctx, "build")
	if err != nil {
		return Result{}, err
	}
	defer done()
	result, err := s.platform.Confirm(ctx, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.lastError = err.Error()
		return Result{}, err
	}
	s.result = &result
	return result, nil
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
	s.phase = "build"
	s.lastError = ""
	s.mu.Unlock()
	defer func() { cancel(); s.mu.Lock(); s.busy, s.cancel, s.phase = false, nil, ""; s.mu.Unlock() }()
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

func (s *Service) Preview(ctx context.Context, id string) (Preview, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed || ((s.result == nil || s.result.ID != id) && (s.draft == nil || s.draft.ID != id)) {
		return Preview{}, ErrNoResult
	}
	if s.busy {
		return Preview{}, ErrBusy
	}
	return s.platform.Preview(ctx, id)
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
	s.draft = nil
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
