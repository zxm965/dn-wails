package fontpatch

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

type enhancedStub struct {
	*stubPlatform
	fail    bool
	idA     string
	started chan struct{}
}

func (p *enhancedStub) ImportFont(_ context.Context, slot int, _ string) (SourceFont, error) {
	id := "a"
	if p.idA != "" {
		id = p.idA
	}
	if slot == 1 {
		id = "b"
	}
	return SourceFont{ID: id}, nil
}
func (p *enhancedStub) SourcePreview(context.Context, string) (Preview, error) { return Preview{}, nil }
func (p *enhancedStub) Compose(ctx context.Context, _ CompositionRequest) (CompositionPreview, error) {
	if p.started != nil {
		close(p.started)
		<-ctx.Done()
		return CompositionPreview{}, ctx.Err()
	}
	if p.fail {
		return CompositionPreview{}, errors.New("invalid font")
	}
	return CompositionPreview{Draft: Draft{ID: "mixed"}, Stats: CompositionStats{Replaced: 10}}, nil
}
func TestCompositionRequiresMatchingPreviewAndSources(t *testing.T) {
	builds := 0
	p := &enhancedStub{stubPlatform: &stubPlatform{available: true, build: func(_ context.Context, id string) (Result, error) {
		builds++
		return Result{ID: "result", DraftID: id}, nil
	}}}
	s := NewEnhancedService(p)
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "font.ttf")
	if _, err := s.ImportFont(ctx, 0, path); err != nil {
		t.Fatal(err)
	}
	if _, err := s.ImportFont(ctx, 1, path); err != nil {
		t.Fatal(err)
	}
	request := CompositionRequest{FontAID: "a", FontBID: "b", ReplacementScope: 3, Options: Options{ScalePercent: 100}}
	if _, err := s.ConfirmComposition(ctx, "mixed", request); !errors.Is(err, ErrNoResult) {
		t.Fatal("confirmed without preview", err)
	}
	if _, err := s.Compose(ctx, request); err != nil {
		t.Fatal(err)
	}
	if builds != 0 {
		t.Fatal("preview generated a patch")
	}
	changed := request
	changed.ReplacementScope = 1
	if _, err := s.ConfirmComposition(ctx, "mixed", changed); !errors.Is(err, ErrNoResult) {
		t.Fatal("accepted changed selection", err)
	}
	if _, err := s.ConfirmComposition(ctx, "mixed", request); err != nil {
		t.Fatal(err)
	}
	p.fail = true
	if _, err := s.Compose(ctx, request); err == nil {
		t.Fatal("expected failure")
	}
	if s.EnhancedStatus().Status.Result == nil || s.EnhancedStatus().Status.Draft.ID != "mixed" {
		t.Fatal("lost previous valid data")
	}
	snapshot := s.EnhancedStatus()
	snapshot.FontA.ID = "tampered"
	snapshot.Composition.FontAID = "tampered"
	if s.EnhancedStatus().FontA.ID != "a" || s.EnhancedStatus().Composition.FontAID != "a" {
		t.Fatal("status leaked mutable pointers")
	}
	p.idA = "new-a"
	if _, err := s.ImportFont(ctx, 0, path); err != nil {
		t.Fatal(err)
	}
	if _, err := s.ConfirmComposition(ctx, "mixed", request); !errors.Is(err, ErrNoResult) {
		t.Fatal("confirmed replaced font source", err)
	}
	if builds != 1 {
		t.Fatal("unexpected build count", builds)
	}
	if err := s.Reset(); err != nil {
		t.Fatal(err)
	}
	if status := s.EnhancedStatus(); status.FontA != nil || status.FontB != nil || status.Composition != nil || status.Status.Draft != nil {
		t.Fatal("reset retained session")
	}
}
func TestCompositionCancellationAndInputValidation(t *testing.T) {
	p := &enhancedStub{stubPlatform: &stubPlatform{available: true}, started: make(chan struct{})}
	s := NewEnhancedService(p)
	request := CompositionRequest{FontAID: "a", FontBID: "b", Options: Options{ScalePercent: 100}}
	for _, mask := range []int{-1, 17, 100} {
		bad := request
		bad.AdjustmentScope = mask
		if _, err := s.Compose(context.Background(), bad); err == nil {
			t.Fatal("accepted invalid scope")
		}
	}
	done := make(chan error, 1)
	go func() { _, err := s.Compose(context.Background(), request); done <- err }()
	<-p.started
	if err := s.Reset(); !errors.Is(err, ErrBusy) {
		t.Fatal("reset during processing", err)
	}
	s.Cancel()
	if err := <-done; !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	if s.Status().Busy {
		t.Fatal("cancel left service busy")
	}
}
