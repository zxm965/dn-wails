package appconfig

import (
	"strings"
	"testing"
)

func TestParseNormalizesPublicNames(t *testing.T) {
	t.Parallel()

	config, err := Parse([]byte("# public application config\nAPP_DISPLAY_NAME='  Desktop App  '\nAPP_AUTHOR_NAME=\"  Team Name  \"\nIGNORED_VALUE=test\n"))
	if err != nil {
		t.Fatalf("parse config: %v", err)
	}
	if config.DisplayName != "Desktop App" {
		t.Fatalf("unexpected display name: %q", config.DisplayName)
	}
	if config.AuthorName != "Team Name" {
		t.Fatalf("unexpected author name: %q", config.AuthorName)
	}
}

func TestParseRejectsInvalidConfig(t *testing.T) {
	t.Parallel()

	tests := map[string]string{
		"missing display name":      "APP_AUTHOR_NAME=Team",
		"missing author name":       "APP_DISPLAY_NAME=Desktop App",
		"empty display name":        "APP_DISPLAY_NAME=  \nAPP_AUTHOR_NAME=Team",
		"empty author name":         "APP_DISPLAY_NAME=Desktop App\nAPP_AUTHOR_NAME=  ",
		"duplicate display name":    "APP_DISPLAY_NAME=One\nAPP_DISPLAY_NAME=Two\nAPP_AUTHOR_NAME=Team",
		"duplicate author name":     "APP_DISPLAY_NAME=Desktop App\nAPP_AUTHOR_NAME=One\nAPP_AUTHOR_NAME=Two",
		"invalid line":              "APP_DISPLAY_NAME=Desktop App\nAPP_AUTHOR_NAME=Team\nINVALID_LINE",
		"unterminated quote":        "APP_DISPLAY_NAME='Desktop App\nAPP_AUTHOR_NAME=Team",
		"display control character": "APP_DISPLAY_NAME=Desktop\tApp\nAPP_AUTHOR_NAME=Team",
		"author control character":  "APP_DISPLAY_NAME=Desktop App\nAPP_AUTHOR_NAME=Desktop\tTeam",
		"display name too long":     "APP_DISPLAY_NAME=" + strings.Repeat("a", maxDisplayNameLength+1) + "\nAPP_AUTHOR_NAME=Team",
		"author name too long":      "APP_DISPLAY_NAME=Desktop App\nAPP_AUTHOR_NAME=" + strings.Repeat("a", maxAuthorNameLength+1),
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
