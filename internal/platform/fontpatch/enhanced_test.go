package fontpatch

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"cull-pear/internal/fontpatch"
)

func TestEnhancedNativeCompositionFromUploadedFonts(t *testing.T) {
	runner := NewEnhanced()
	if !runner.Available() {
		if os.Getenv("DN_REQUIRE_FONT_RUNTIME") == "1" {
			t.Fatal("native runtime required")
		}
		t.Skip("runtime not built")
	}
	t.Setenv("PATH", "")
	t.Setenv("PYTHONPATH", "")
	t.Setenv("PYTHONHOME", "")
	service := fontpatch.NewEnhancedService(runner)
	t.Cleanup(func() {
		if err := service.Close(); err != nil {
			t.Error(err)
		}
	})
	original, err := os.ReadFile("testdata/synthetic.ttf")
	if err != nil {
		t.Fatal(err)
	}
	base := filepath.Join(t.TempDir(), "base.ttf")
	if err := os.WriteFile(base, original, 0600); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	a, err := service.ImportFont(ctx, 0, base)
	if err != nil {
		t.Fatal(err)
	}
	donor := filepath.Join(t.TempDir(), "letters.otf")
	data, err := os.ReadFile("testdata/synthetic.otf")
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(donor, data, 0600); err != nil {
		t.Fatal(err)
	}
	b, err := service.ImportFont(ctx, 1, donor)
	if err != nil {
		t.Fatal(err)
	}
	if b.Counts.Letters != 1 || a.Counts.Letters != 1 {
		t.Fatal("source overview missing character counts")
	}
	if _, err := service.SourcePreview(ctx, b.ID); err != nil {
		t.Fatal(err)
	}
	if err = os.Remove(donor); err != nil {
		t.Fatal(err)
	}
	request := fontpatch.CompositionRequest{FontAID: a.ID, FontBID: b.ID, ReplacementScope: 2, AdjustmentScope: 2, Options: fontpatch.Options{ScalePercent: 110, Weight: 2}}
	draft, err := service.Compose(ctx, request)
	if err != nil {
		t.Fatal(err)
	}
	if service.Status().Result != nil || draft.Stats.Replaced != 1 || draft.Stats.Adjusted != 1 {
		t.Fatal("preview packaged or reported wrong scope")
	}
	preview, err := service.Preview(ctx, draft.Draft.ID)
	if err != nil {
		t.Fatal(err)
	}
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err := service.Compose(canceled, request); !errors.Is(err, context.Canceled) {
		t.Fatal("canceled composition", err)
	}
	if service.Status().Draft.ID != draft.Draft.ID {
		t.Fatal("cancel lost preview")
	}
	result, err := service.ConfirmComposition(ctx, draft.Draft.ID, request)
	if err != nil {
		t.Fatal(err)
	}
	packed, err := service.Preview(ctx, result.ID)
	if err != nil || packed.Data != preview.Data || result.SHA256 != draft.Draft.SHA256 {
		t.Fatal("packed font differs from composition", err)
	}
	after, err := os.ReadFile(base)
	if err != nil || !bytes.Equal(after, original) {
		t.Fatal("uploaded base font changed", err)
	}
	export := filepath.Join(t.TempDir(), "combined.zip")
	if err := service.Export(ctx, result.ID, export); err != nil {
		t.Fatal(err)
	}
	roots := []string{runner.fonts[0].root, runner.fonts[1].root, runner.runtimeRoot, runner.draft.root, runner.root}
	if err := service.Reset(); err != nil {
		t.Fatal(err)
	}
	for _, root := range roots {
		if _, err := os.Stat(root); !errors.Is(err, os.ErrNotExist) {
			t.Fatal("reset leaked temporary files", root, err)
		}
	}
	if _, err := os.Stat(export); err != nil {
		t.Fatal("reset removed export", err)
	}
	if _, err := service.SourcePreview(ctx, a.ID); !errors.Is(err, fontpatch.ErrNoResult) {
		t.Fatal("stale source accessible", err)
	}
}
