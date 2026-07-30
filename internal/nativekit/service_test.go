package nativekit

import (
	"context"
	"errors"
	"testing"
)

type platformStub struct {
	openedURL string
}

func (p *platformStub) OpenExternalURL(_ context.Context, rawURL string) { p.openedURL = rawURL }
func (p *platformStub) ReadClipboard(context.Context) (string, error)    { return "clipboard", nil }
func (p *platformStub) WriteClipboard(context.Context, string) error     { return nil }
func (p *platformStub) OpenFiles(context.Context, OpenFilesOptions) ([]string, error) {
	return nil, nil
}
func (p *platformStub) OpenDirectory(context.Context, string, string) (string, error) {
	return "", nil
}
func (p *platformStub) SaveFile(context.Context, SaveFileOptions) (string, error) {
	return "", nil
}
func (p *platformStub) ShowMessageDialog(context.Context, MessageDialogOptions) (string, error) {
	return "", nil
}
func (p *platformStub) Screens(context.Context) ([]Screen, error) { return nil, nil }

func TestServiceValidatesExternalURLs(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)

	if err := service.OpenExternalURL(context.Background(), "https://wails.io/docs"); err != nil {
		t.Fatalf("open valid URL: %v", err)
	}
	if platform.openedURL != "https://wails.io/docs" {
		t.Fatalf("unexpected opened URL %q", platform.openedURL)
	}

	for _, rawURL := range []string{"javascript:alert(1)", "file:///tmp/test", "not-a-url"} {
		if err := service.OpenExternalURL(context.Background(), rawURL); !errors.Is(err, ErrInvalidURL) {
			t.Fatalf("expected invalid URL error for %q, got %v", rawURL, err)
		}
	}
}
