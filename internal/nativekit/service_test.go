package nativekit

import (
	"errors"
	"testing"
)

type platformStub struct {
	openedURL string
}

func (p *platformStub) OpenExternalURL(rawURL string) error { p.openedURL = rawURL; return nil }
func (p *platformStub) OpenPath(string) error               { return nil }
func (p *platformStub) ReadClipboard() (string, error)      { return "clipboard", nil }
func (p *platformStub) WriteClipboard(string) error         { return nil }
func (p *platformStub) OpenFiles(OpenFilesOptions) ([]string, error) {
	return nil, nil
}
func (p *platformStub) OpenDirectory(string, string) (string, error) {
	return "", nil
}
func (p *platformStub) SaveFile(SaveFileOptions) (string, error) {
	return "", nil
}
func (p *platformStub) ShowMessageDialog(MessageDialogOptions) (string, error) {
	return "", nil
}
func (p *platformStub) Screens() ([]Screen, error) { return nil, nil }

func TestServiceValidatesExternalURLs(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)

	if err := service.OpenExternalURL("https://wails.io/docs"); err != nil {
		t.Fatalf("open valid URL: %v", err)
	}
	if platform.openedURL != "https://wails.io/docs" {
		t.Fatalf("unexpected opened URL %q", platform.openedURL)
	}

	for _, rawURL := range []string{"javascript:alert(1)", "file:///tmp/test", "not-a-url"} {
		if err := service.OpenExternalURL(rawURL); !errors.Is(err, ErrInvalidURL) {
			t.Fatalf("expected invalid URL error for %q, got %v", rawURL, err)
		}
	}
}

func TestServiceOpenFilesNormalizesCancelledSelection(t *testing.T) {
	t.Parallel()

	service := NewService(&platformStub{})
	paths, err := service.OpenFiles(OpenFilesOptions{Title: "Select files"})
	if err != nil {
		t.Fatalf("open files: %v", err)
	}
	if paths == nil {
		t.Fatal("expected cancelled selection to return a non-nil empty slice")
	}
	if len(paths) != 0 {
		t.Fatalf("expected no selected files, got %v", paths)
	}
}
