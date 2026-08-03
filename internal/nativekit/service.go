package nativekit

import (
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
	OpenExternalURL(rawURL string) error
	OpenPath(path string) error
	ReadClipboard() (string, error)
	WriteClipboard(text string) error
	OpenFiles(options OpenFilesOptions) ([]string, error)
	OpenDirectory(title string, defaultDirectory string) (string, error)
	SaveFile(options SaveFileOptions) (string, error)
	ShowMessageDialog(options MessageDialogOptions) (string, error)
	Screens() ([]Screen, error)
}

type Service struct {
	platform Platform
}

func NewService(platform Platform) *Service {
	return &Service{platform: platform}
}

func (s *Service) OpenExternalURL(rawURL string) error {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return ErrInvalidURL
	}

	return s.platform.OpenExternalURL(parsed.String())
}

func (s *Service) OpenPath(path string) error {
	path = filepath.Clean(strings.TrimSpace(path))
	if !filepath.IsAbs(path) {
		return ErrInvalidPath
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidPath, err)
	}

	return s.platform.OpenPath(path)
}

func (s *Service) ReadClipboard() (string, error) {
	return s.platform.ReadClipboard()
}

func (s *Service) WriteClipboard(text string) error {
	return s.platform.WriteClipboard(text)
}

func (s *Service) OpenFiles(options OpenFilesOptions) ([]string, error) {
	paths, err := s.platform.OpenFiles(options)
	if err != nil {
		return nil, err
	}
	if paths == nil {
		return []string{}, nil
	}
	return paths, nil
}

func (s *Service) OpenDirectory(title string, defaultDirectory string) (string, error) {
	return s.platform.OpenDirectory(title, defaultDirectory)
}

func (s *Service) SaveFile(options SaveFileOptions) (string, error) {
	return s.platform.SaveFile(options)
}

func (s *Service) ShowMessageDialog(options MessageDialogOptions) (string, error) {
	return s.platform.ShowMessageDialog(options)
}

func (s *Service) Screens() ([]Screen, error) {
	return s.platform.Screens()
}
