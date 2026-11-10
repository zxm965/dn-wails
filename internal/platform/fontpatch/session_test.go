package fontpatch

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"cull-pear/internal/fontpatch"
)

func TestFailedAdjustmentPreservesSessionAndRemovesNewOutput(t *testing.T) {
	root := t.TempDir()
	input := filepath.Join(root, "original.ttf")
	if err := os.WriteFile(input, []byte("immutable original"), 0600); err != nil {
		t.Fatal(err)
	}
	oldOutput := filepath.Join(root, "preview-previous")
	if err := os.Mkdir(oldOutput, 0700); err != nil {
		t.Fatal(err)
	}
	previous := &draftState{root: root, source: input, outputRoot: oldOutput, info: fontpatch.Draft{ID: "previous"}}
	runner := &Runner{executable: filepath.Join(root, "missing-runtime"), draft: previous}
	if _, err := runner.Adjust(context.Background(), "previous", fontpatch.Options{ScalePercent: 100}); err == nil {
		t.Fatal("expected worker launch failure")
	}
	if runner.draft != previous {
		t.Fatal("failed adjustment replaced previous draft")
	}
	outputs, err := filepath.Glob(filepath.Join(root, "preview-*"))
	if err != nil || len(outputs) != 1 || outputs[0] != oldOutput {
		t.Fatal("failed adjustment leaked output or deleted old preview", outputs, err)
	}
	data, err := os.ReadFile(input)
	if err != nil || string(data) != "immutable original" {
		t.Fatal("original snapshot changed", err)
	}
}

func TestSupportedCodepointsValidation(t *testing.T) {
	for _, sample := range []struct {
		name, data string
		valid      bool
	}{
		{"unicode", "[32,65,128512]", true},
		{"empty", "[]", true},
		{"duplicate", "[65,65]", false},
		{"unordered", "[66,65]", false},
		{"negative", "[-1]", false},
		{"surrogate", "[55296]", false},
		{"outsideUnicode", "[1114112]", false},
		{"malformed", "[65", false},
	} {
		t.Run(sample.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "coverage.json")
			if err := os.WriteFile(path, []byte(sample.data), 0600); err != nil {
				t.Fatal(err)
			}
			_, err := readSupportedCodepoints(context.Background(), path)
			if (err == nil) != sample.valid {
				t.Fatalf("valid=%v, error=%v", sample.valid, err)
			}
		})
	}
}
