package fontpatch

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

type stubPlatform struct {
	available bool
	build     func(context.Context, string) (Result, error)
	exported  bool
}

func (p *stubPlatform) Available() bool { return p.available }
func (p *stubPlatform) Build(ctx context.Context, source string) (Result, error) {
	return p.build(ctx, source)
}
func (p *stubPlatform) Export(context.Context, string, string) error { p.exported = true; return nil }
func (p *stubPlatform) Close() error                                 { return nil }

func (p *stubPlatform) Reset() error { return nil }

func TestBuildValidatesInputAndKeepsPreviousResultOnFailure(t *testing.T) {
	p := &stubPlatform{available: true, build: func(context.Context, string) (Result, error) { return Result{ID: "first"}, nil }}
	s := NewService(p)
	ctx := context.Background()
	for _, path := range []string{"", "relative.ttf", filepath.Join(t.TempDir(), "wrong.zip")} {
		if _, err := s.Build(ctx, path); !errors.Is(err, ErrInvalidFont) {
			t.Fatalf("expected invalid font for %q: %v", path, err)
		}
	}
	source := filepath.Join(t.TempDir(), "font.OTF")
	if _, err := s.Build(ctx, source); err != nil {
		t.Fatal(err)
	}
	p.build = func(context.Context, string) (Result, error) { return Result{}, errors.New("bad font") }
	if _, err := s.Build(ctx, source); err == nil {
		t.Fatal("invalid build succeeded")
	}
	status := s.Status()
	if status.Busy || status.Result == nil || status.Result.ID != "first" {
		t.Fatalf("lost previous result: %+v", status)
	}
	status.Result.ID = "modified-copy"
	if s.Status().Result.ID != "first" {
		t.Fatal("status leaked internal state")
	}
	if err := s.Export(ctx, "wrong-id", filepath.Join(t.TempDir(), "font.zip")); !errors.Is(err, ErrNoResult) {
		t.Fatal(err)
	}
	if err := s.Export(ctx, "first", filepath.Join(t.TempDir(), "font.ttf")); err == nil {
		t.Fatal("accepted wrong extension")
	}
	if err := s.Export(ctx, "first", filepath.Join(t.TempDir(), "font.zip")); err != nil || !p.exported {
		t.Fatal(err)
	}
	if err := s.Reset(); err != nil {
		t.Fatal(err)
	}
	if status := s.Status(); status.Result != nil || status.Error != "" {
		t.Fatal("reset retained result/error")
	}
	if err := s.Export(ctx, "first", filepath.Join(t.TempDir(), "font.zip")); !errors.Is(err, ErrNoResult) {
		t.Fatal("reset result remained exportable")
	}
}

func TestConcurrentBuildAndCancellation(t *testing.T) {
	started := make(chan struct{})
	p := &stubPlatform{available: true, build: func(ctx context.Context, _ string) (Result, error) {
		close(started)
		<-ctx.Done()
		return Result{}, ctx.Err()
	}}
	s := NewService(p)
	source := filepath.Join(t.TempDir(), "font.ttf")
	done := make(chan error, 1)
	go func() { _, err := s.Build(context.Background(), source); done <- err }()
	<-started
	if err := s.Reset(); !errors.Is(err, ErrBusy) {
		t.Fatal("reset raced active build")
	}
	if _, err := s.Build(context.Background(), source); !errors.Is(err, ErrBusy) {
		t.Fatalf("expected busy: %v", err)
	}
	s.Cancel()
	if err := <-done; !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel: %v", err)
	}
	if s.Status().Busy {
		t.Fatal("busy after cancellation")
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Build(context.Background(), source); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
}
