package fontpatch

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
	"time"

	"cull-pear/internal/fontpatch"
)

func TestPreviewAdjustConfirmUsesSnapshotAndGeneratesOnlyOnConfirmation(t *testing.T) {
	t.Setenv("PATH", "")
	t.Setenv("PYTHONPATH", "")
	t.Setenv("PYTHONHOME", "")
	if !New().Available() {
		if os.Getenv("DN_REQUIRE_FONT_RUNTIME") == "1" {
			t.Fatal("native runtime required")
		}
		t.Skip("native runtime not built")
	}
	for _, extension := range []string{"ttf", "otf"} {
		t.Run(extension, func(t *testing.T) {
			runner := New()
			service := fontpatch.NewService(runner)
			t.Cleanup(func() {
				if err := service.Close(); err != nil {
					t.Error(err)
				}
			})
			original, err := os.ReadFile(filepath.Join("testdata", "synthetic."+extension))
			if err != nil {
				t.Fatal(err)
			}
			source := filepath.Join(t.TempDir(), "原始 字体."+extension)
			if err := os.WriteFile(source, original, 0600); err != nil {
				t.Fatal(err)
			}
			ctx := context.Background()
			draft, err := service.Prepare(ctx, source, fontpatch.Options{ScalePercent: 100})
			if err != nil {
				t.Fatal(err)
			}
			if service.Status().Result != nil || service.Status().Draft.ID != draft.ID {
				t.Fatal("prepare built a patch or lost draft")
			}
			data, err := service.Preview(ctx, draft.ID)
			if err != nil {
				t.Fatal(err)
			}
			before, err := base64.StdEncoding.DecodeString(data.Data)
			if err != nil {
				t.Fatal(err)
			}
			if extension == "ttf" && !bytes.Equal(before, original) {
				t.Fatal("default TTF preview changed input")
			}
			// Editing/deleting the user's original after upload must not affect adjustments.
			if err := os.Remove(source); err != nil {
				t.Fatal(err)
			}
			adjusted, err := service.Adjust(ctx, draft.ID, fontpatch.Options{ScalePercent: 110, Weight: 2})
			if err != nil {
				t.Fatal(err)
			}
			if !adjusted.Adjusted || adjusted.SHA256 == draft.SHA256 {
				t.Fatal("no real outline change")
			}
			if err := filepath.WalkDir(runner.draft.root, func(path string, entry fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if filepath.Ext(path) == ".pak" {
					t.Fatal("preview generated a PAK")
				}
				return nil
			}); err != nil {
				t.Fatal(err)
			}
			if _, err := service.Confirm(ctx, draft.ID); !errors.Is(err, fontpatch.ErrNoResult) {
				t.Fatal("confirmed stale preview", err)
			}
			data, err = service.Preview(ctx, adjusted.ID)
			if err != nil {
				t.Fatal(err)
			}
			expected, err := base64.StdEncoding.DecodeString(data.Data)
			if err != nil {
				t.Fatal(err)
			}
			result, err := service.Confirm(ctx, adjusted.ID)
			if err != nil {
				t.Fatal(err)
			}
			digest := sha256.Sum256(expected)
			if result.SHA256 != hex.EncodeToString(digest[:]) || result.DraftID != adjusted.ID || result.Options != adjusted.Options || !result.Adjusted {
				t.Fatalf("confirmation did not use preview: %+v", result)
			}
			actual, err := service.Preview(ctx, result.ID)
			if err != nil || actual.Data != data.Data {
				t.Fatal("packed font differs from preview", err)
			}
			restored, err := service.Adjust(ctx, adjusted.ID, fontpatch.Options{ScalePercent: 100})
			if err != nil || restored.SHA256 != draft.SHA256 {
				t.Fatal("adjustments accumulated instead of restoring original", err)
			}
			previewRoot, resultRoot := runner.draft.root, runner.root
			if err := service.Reset(); err != nil {
				t.Fatal(err)
			}
			for _, path := range []string{previewRoot, resultRoot} {
				if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
					t.Fatal("reset left temporary data")
				}
			}
			if _, err := service.Preview(ctx, restored.ID); !errors.Is(err, fontpatch.ErrNoResult) {
				t.Fatal("reset left preview accessible", err)
			}
		})
	}
}

func TestCancelDuringPackingPreservesPreviewAndAllowsRetry(t *testing.T) {
	runner := New()
	if !runner.Available() {
		if os.Getenv("DN_REQUIRE_FONT_RUNTIME") == "1" {
			t.Fatal("native runtime required")
		}
		t.Skip("native runtime not built")
	}
	workspace := t.TempDir()
	t.Setenv("TMPDIR", workspace)
	t.Setenv("TMP", workspace)
	t.Setenv("TEMP", workspace)
	service := fontpatch.NewService(runner)
	t.Cleanup(func() {
		if err := service.Close(); err != nil {
			t.Error(err)
		}
	})
	source, err := filepath.Abs(filepath.Join("testdata", "synthetic.ttf"))
	if err != nil {
		t.Fatal(err)
	}
	draft, err := service.Prepare(context.Background(), source, fontpatch.Options{ScalePercent: 100})
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { _, err := service.Confirm(context.Background(), draft.ID); done <- err }()
	defer service.Cancel()
	deadline := time.NewTimer(20 * time.Second)
	defer deadline.Stop()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	packing := false
	for !packing {
		select {
		case err := <-done:
			t.Fatalf("build ended before cancellation: %v", err)
		case <-deadline.C:
			t.Fatal("packing did not start")
		case <-ticker.C:
			paths, err := filepath.Glob(filepath.Join(workspace, "dn-font-patch-*", "build", "stage", "*.pak"))
			if err != nil {
				t.Fatal(err)
			}
			packing = len(paths) > 0
		}
	}
	service.Cancel()
	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("cancel result: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("canceled build kept waiting")
	}
	status := service.Status()
	if status.Busy || status.Phase != "" || status.Result != nil || status.Draft == nil || status.Draft.ID != draft.ID {
		t.Fatalf("cancel did not restore idle preview: %+v", status)
	}
	roots, err := filepath.Glob(filepath.Join(workspace, "dn-font-patch-*"))
	if err != nil || len(roots) != 1 {
		t.Fatalf("canceled build left temporary output: %v, %v", roots, err)
	}
	if _, err := service.Preview(context.Background(), draft.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Confirm(context.Background(), draft.ID); err != nil {
		t.Fatalf("cannot retry after cancellation: %v", err)
	}
}
