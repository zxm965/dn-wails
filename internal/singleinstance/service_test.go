package singleinstance

import (
	"strings"
	"testing"
)

func TestServiceNormalizesSecondInstanceData(t *testing.T) {
	t.Parallel()

	service := NewService()
	longArgument := strings.Repeat("a", maxArgumentLength+100)
	result := service.Normalize([]string{"  --open  ", "", longArgument}, " /tmp/project/../project ")

	if len(result.Arguments) != 2 {
		t.Fatalf("expected two arguments, got %d", len(result.Arguments))
	}
	if result.Arguments[0] != "--open" {
		t.Fatalf("expected trimmed argument, got %q", result.Arguments[0])
	}
	if len(result.Arguments[1]) != maxArgumentLength {
		t.Fatalf("expected long argument to be truncated")
	}
	if result.WorkingDirectory != "/tmp/project" {
		t.Fatalf("expected cleaned working directory, got %q", result.WorkingDirectory)
	}
}
