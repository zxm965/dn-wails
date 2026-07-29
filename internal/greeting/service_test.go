package greeting

import (
	"errors"
	"testing"
)

func TestServiceGreet(t *testing.T) {
	t.Parallel()

	service := NewService()

	tests := []struct {
		name      string
		input     string
		expected  string
		expectErr error
	}{
		{
			name:     "returns a greeting",
			input:    "Wails",
			expected: "Hello Wails, It's show time!",
		},
		{
			name:     "trims surrounding whitespace",
			input:    "  React  ",
			expected: "Hello React, It's show time!",
		},
		{
			name:      "rejects an empty name",
			input:     "   ",
			expectErr: ErrNameRequired,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			result, err := service.Greet(test.input)
			if !errors.Is(err, test.expectErr) {
				t.Fatalf("expected error %v, got %v", test.expectErr, err)
			}
			if result != test.expected {
				t.Fatalf("expected %q, got %q", test.expected, result)
			}
		})
	}
}
