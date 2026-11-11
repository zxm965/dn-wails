package fontpatch

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
)

type CharacterCounts struct {
	Numbers int `json:"numbers"`
	Letters int `json:"letters"`
	Text    int `json:"text"`
	Symbols int `json:"symbols"`
	Other   int `json:"other"`
}
type SourceFont struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Origin      string          `json:"origin"`
	SHA256      string          `json:"sha256"`
	GlyphCount  int             `json:"glyphCount"`
	Counts      CharacterCounts `json:"counts"`
	GBKCoverage GBKCoverage     `json:"gbkCoverage"`
}
type CompositionRequest struct {
	FontAID          string  `json:"fontAId"`
	FontBID          string  `json:"fontBId"`
	ReplacementScope int     `json:"replacementScope"`
	AdjustmentScope  int     `json:"adjustmentScope"`
	Options          Options `json:"options"`
}

func (r CompositionRequest) Validate() error {
	if r.FontAID == "" || r.FontBID == "" {
		return errors.New("请先导入字体 A 和字体 B")
	}
	if r.ReplacementScope < 0 || r.ReplacementScope > 16 || r.AdjustmentScope < 0 || r.AdjustmentScope > 16 {
		return errors.New("字符范围无效")
	}
	return r.Options.Validate()
}

type CompositionStats struct {
	Replaced int `json:"replaced"`
	Adjusted int `json:"adjusted"`
	Fallback int `json:"fallback"`
}
type CompositionPreview struct {
	Draft Draft            `json:"draft"`
	Stats CompositionStats `json:"stats"`
}
type EnhancedStatus struct {
	Status      Status              `json:"status"`
	FontA       *SourceFont         `json:"fontA"`
	FontB       *SourceFont         `json:"fontB"`
	Composition *CompositionRequest `json:"composition"`
	Stats       CompositionStats    `json:"stats"`
}
type EnhancedPlatform interface {
	Platform
	ImportFont(context.Context, int, string) (SourceFont, error)
	Compose(context.Context, CompositionRequest) (CompositionPreview, error)
	SourcePreview(context.Context, string) (Preview, error)
}
type EnhancedService struct {
	*Service
	enhanced     EnhancedPlatform
	fontA, fontB *SourceFont
	composition  *CompositionRequest
	stats        CompositionStats
}

func NewEnhancedService(p EnhancedPlatform) *EnhancedService {
	return &EnhancedService{Service: NewService(p), enhanced: p}
}
func (s *EnhancedService) EnhancedStatus() EnhancedStatus {
	status := s.Status()
	s.mu.Lock()
	defer s.mu.Unlock()
	result := EnhancedStatus{Status: status, Stats: s.stats}
	if s.fontA != nil {
		value := *s.fontA
		result.FontA = &value
	}
	if s.fontB != nil {
		value := *s.fontB
		result.FontB = &value
	}
	if s.composition != nil {
		value := *s.composition
		result.Composition = &value
	}
	return result
}
func (s *EnhancedService) ImportFont(ctx context.Context, slot int, path string) (SourceFont, error) {
	path = strings.TrimSpace(path)
	ext := strings.ToLower(filepath.Ext(path))
	if (slot != 0 && slot != 1) || !filepath.IsAbs(path) || (ext != ".ttf" && ext != ".otf") {
		return SourceFont{}, ErrInvalidFont
	}
	return s.importSource(ctx, slot, func(ctx context.Context) (SourceFont, error) { return s.enhanced.ImportFont(ctx, slot, path) })
}
func (s *EnhancedService) importSource(ctx context.Context, slot int, load func(context.Context) (SourceFont, error)) (SourceFont, error) {
	ctx, done, err := s.begin(ctx, "import")
	if err != nil {
		return SourceFont{}, err
	}
	defer done()
	font, err := load(ctx)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.lastError = err.Error()
		return SourceFont{}, err
	}
	if slot == 0 {
		s.fontA = &font
	} else {
		s.fontB = &font
	}
	return font, nil
}
func (s *EnhancedService) Compose(ctx context.Context, request CompositionRequest) (CompositionPreview, error) {
	if err := request.Validate(); err != nil {
		return CompositionPreview{}, err
	}
	ctx, done, err := s.begin(ctx, "preview")
	if err != nil {
		return CompositionPreview{}, err
	}
	defer done()
	result, err := s.enhanced.Compose(ctx, request)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.lastError = err.Error()
		return CompositionPreview{}, err
	}
	s.draft = &result.Draft
	s.composition = &request
	s.stats = result.Stats
	return result, nil
}
func (s *EnhancedService) ConfirmComposition(ctx context.Context, id string, request CompositionRequest) (Result, error) {
	ctx, done, err := s.begin(ctx, "build")
	if err != nil {
		return Result{}, err
	}
	defer done()
	s.mu.Lock()
	valid := s.composition != nil && *s.composition == request && s.draft != nil && s.draft.ID == id && s.fontA != nil && s.fontB != nil && s.fontA.ID == request.FontAID && s.fontB.ID == request.FontBID
	s.mu.Unlock()
	if !valid {
		return Result{}, ErrNoResult
	}
	result, err := s.enhanced.Confirm(ctx, id)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err != nil {
		s.lastError = err.Error()
		return Result{}, err
	}
	s.result = &result
	return result, nil
}
func (s *EnhancedService) SourcePreview(ctx context.Context, id string) (Preview, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return Preview{}, ErrUnavailable
	}
	if s.busy {
		return Preview{}, ErrBusy
	}
	return s.enhanced.SourcePreview(ctx, id)
}
func (s *EnhancedService) Reset() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.busy {
		return ErrBusy
	}
	if s.closed {
		return ErrUnavailable
	}
	if err := s.enhanced.Reset(); err != nil {
		return err
	}
	s.fontA, s.fontB, s.composition, s.draft, s.result = nil, nil, nil, nil, nil
	s.stats = CompositionStats{}
	s.lastError = ""
	return nil
}
