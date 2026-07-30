package appconfig

import (
	"strings"
	"testing"
)

func TestParseNormalizesDisplayName(t *testing.T) {
	t.Parallel()

	config, err := Parse([]byte("# public application config\nAPP_DISPLAY_NAME='  Desktop App  '\nIGNORED_VALUE=test\n"))
	if err != nil {
		t.Fatalf("parse config: %v", err)
	}
	if config.DisplayName != "Desktop App" {
		t.Fatalf("unexpected display name: %q", config.DisplayName)
	}
}

func TestParseRejectsInvalidConfig(t *testing.T) {
	t.Parallel()

	tests := map[string]string{
		"missing display name":   "OTHER_VALUE=test",
		"empty display name":     "APP_DISPLAY_NAME=  ",
		"duplicate display name": "APP_DISPLAY_NAME=One\nAPP_DISPLAY_NAME=Two",
		"invalid line":           "APP_DISPLAY_NAME=Desktop App\nINVALID_LINE",
		"unterminated quote":     "APP_DISPLAY_NAME='Desktop App",
		"control character":      "APP_DISPLAY_NAME=Desktop\tApp",
		"too long":               "APP_DISPLAY_NAME=" + strings.Repeat("a", maxDisplayNameLength+1),
	}

	for name, data := range tests {
		name, data := name, data
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if _, err := Parse([]byte(data)); err == nil {
				t.Fatal("expected invalid config to be rejected")
			}
		})
	}
}
