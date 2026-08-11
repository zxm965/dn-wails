package quicknotes

import (
	"errors"
	"strings"
	"testing"
)

func TestNormalizeInputDerivesAndTrimsTitle(t *testing.T) {
	t.Parallel()

	normalized, err := normalizeInput(NoteInput{Title: "  ", Content: "\n 第一行内容 \n第二行"})
	if err != nil {
		t.Fatalf("normalize note: %v", err)
	}
	if normalized.Title != "第一行内容" {
		t.Fatalf("expected derived title, got %q", normalized.Title)
	}

	normalized, err = normalizeInput(NoteInput{Title: "  手动标题  "})
	if err != nil {
		t.Fatalf("normalize manual title: %v", err)
	}
	if normalized.Title != "手动标题" {
		t.Fatalf("expected trimmed title, got %q", normalized.Title)
	}
}

func TestNormalizeInputRejectsInvalidValues(t *testing.T) {
	t.Parallel()

	if _, err := normalizeInput(NoteInput{ID: -1}); !errors.Is(err, ErrInvalidNote) {
		t.Fatalf("expected invalid id error, got %v", err)
	}
	if _, err := normalizeInput(NoteInput{Title: strings.Repeat("字", maximumTitleRunes+1)}); !errors.Is(err, ErrInvalidNote) {
		t.Fatalf("expected invalid title error, got %v", err)
	}
	if _, err := normalizeInput(NoteInput{Content: strings.Repeat("字", maximumBodyRunes+1)}); !errors.Is(err, ErrInvalidNote) {
		t.Fatalf("expected invalid content error, got %v", err)
	}
}

func TestUnavailableServiceReturnsExplicitError(t *testing.T) {
	t.Parallel()

	service := NewUnavailableService()
	if _, err := service.List(); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("expected unavailable error, got %v", err)
	}
}
