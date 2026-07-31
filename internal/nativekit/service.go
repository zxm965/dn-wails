package nativekit

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

var (
	ErrInvalidURL  = errors.New("invalid external URL")
	ErrInvalidPath = errors.New("invalid local path")
)

type FileFilter struct {
	DisplayName string `json:"displayName"`
	Pattern     string `json:"pattern"`
}

type OpenFilesOptions struct {
	Title            string       `json:"title"`
	DefaultDirectory string       `json:"defaultDirectory,omitempty"`
	Filters          []FileFilter `json:"filters,omitempty"`
	Multiple         bool         `json:"multiple"`
}

type SaveFileOptions struct {
	Title            string       `json:"title"`
	DefaultDirectory string       `json:"defaultDirectory,omitempty"`
	DefaultFilename  string       `json:"defaultFilename,omitempty"`
	Filters          []FileFilter `json:"filters,omitempty"`
}

type MessageDialogOptions struct {
	Type          string   `json:"type"`
	Title         string   `json:"title"`
	Message       string   `json:"message"`
	Buttons       []string `json:"buttons,omitempty"`
	DefaultButton string   `json:"defaultButton,omitempty"`
	CancelButton  string   `json:"cancelButton,omitempty"`
}

type Screen struct {
	IsCurrent      bool `json:"isCurrent"`
	IsPrimary      bool `json:"isPrimary"`
	Width          int  `json:"width"`
	Height         int  `json:"height"`
	PhysicalWidth  int  `json:"physicalWidth"`
	PhysicalHeight int  `json:"physicalHeight"`
}

type Platform interface {
	OpenExternalURL(ctx context.Context, rawURL string)
	ReadClipboard(ctx context.Context) (string, error)
	WriteClipboard(ctx context.Context, text string) error
	OpenFiles(ctx context.Context, options OpenFilesOptions) ([]string, error)
	OpenDirectory(ctx context.Context, title string, defaultDirectory string) (string, error)
	SaveFile(ctx context.Context, options SaveFileOptions) (string, error)
	ShowMessageDialog(ctx context.Context, options MessageDialogOptions) (string, error)
	Screens(ctx context.Context) ([]Screen, error)
}

type Service struct {
	platform Platform
}

func NewService(platform Platform) *Service {
	return &Service{platform: platform}
}

func (s *Service) OpenExternalURL(ctx context.Context, rawURL string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return ErrInvalidURL
	}

	s.platform.OpenExternalURL(ctx, parsed.String())
	return nil
}

func (s *Service) OpenPath(ctx context.Context, path string) error {
	path = filepath.Clean(strings.TrimSpace(path))
	if !filepath.IsAbs(path) {
		return ErrInvalidPath
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidPath, err)
	}

	pathURL := url.URL{Scheme: "file", Path: filepath.ToSlash(path)}
	s.platform.OpenExternalURL(ctx, pathURL.String())
	return nil
}

func (s *Service) ReadClipboard(ctx context.Context) (string, error) {
	return s.platform.ReadClipboard(ctx)
}

func (s *Service) WriteClipboard(ctx context.Context, text string) error {
	return s.platform.WriteClipboard(ctx, text)
}

func (s *Service) OpenFiles(ctx context.Context, options OpenFilesOptions) ([]string, error) {
	paths, err := s.platform.OpenFiles(ctx, options)
	if err != nil {
		return nil, err
	}
	if paths == nil {
		return []string{}, nil
	}
	return paths, nil
}

func (s *Service) OpenDirectory(ctx context.Context, title string, defaultDirectory string) (string, error) {
	return s.platform.OpenDirectory(ctx, title, defaultDirectory)
}

func (s *Service) SaveFile(ctx context.Context, options SaveFileOptions) (string, error) {
	return s.platform.SaveFile(ctx, options)
}

func (s *Service) ShowMessageDialog(ctx context.Context, options MessageDialogOptions) (string, error) {
	return s.platform.ShowMessageDialog(ctx, options)
}

func (s *Service) Screens(ctx context.Context) ([]Screen, error) {
	return s.platform.Screens(ctx)
}
