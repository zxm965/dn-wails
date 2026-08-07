package appupdate

import (
	"errors"
	"strings"
	"testing"
)

func TestResolveUpdateBaseURLUsesProcessEnvironment(t *testing.T) {
	t.Setenv(updateBaseURLKey, "https://environment.example/dn-wails/")

	got, err := ResolveUpdateBaseURL([]byte("APP_UPDATE_BASE_URL=https://embedded.example/dn-wails\n"))
	if err != nil {
		t.Fatalf("resolve update base URL: %v", err)
	}
	if got != "https://environment.example/dn-wails" {
		t.Fatalf("expected normalized environment URL, got %q", got)
	}
}

func TestResolveUpdateBaseURLUsesEmbeddedLocalEnvironment(t *testing.T) {
	t.Setenv(updateBaseURLKey, "")

	got, err := ResolveUpdateBaseURL([]byte("APP_UPDATE_BASE_URL='https://updates.example/dn-wails/'\n"))
	if err != nil {
		t.Fatalf("resolve embedded update base URL: %v", err)
	}
	if got != "https://updates.example/dn-wails" {
		t.Fatalf("expected normalized embedded URL, got %q", got)
	}
}

func TestResolveUpdateBaseURLRejectsMissingAndInvalidConfiguration(t *testing.T) {
	t.Setenv(updateBaseURLKey, "")

	if _, err := ResolveUpdateBaseURL(nil); !errors.Is(err, ErrUpdateBaseURLNotConfigured) {
		t.Fatalf("expected missing update URL error, got %v", err)
	}

	invalidValues := []string{
		"http://updates.example/dn-wails",
		"https://user:password@updates.example/dn-wails",
		"https://updates.example/dn-wails?channel=stable",
		"https://updates.example/dn-wails#latest",
		strings.Repeat("a", maximumUpdateURLLength+1),
	}
	for _, value := range invalidValues {
		if _, err := NormalizeUpdateBaseURL(value); err == nil {
			t.Fatalf("expected invalid update URL %q to be rejected", value)
		}
	}
}

func TestReadUpdateBaseURLRejectsDuplicates(t *testing.T) {
	_, err := readUpdateBaseURL([]byte("APP_UPDATE_BASE_URL=https://first.example\nAPP_UPDATE_BASE_URL=https://second.example\n"))
	if err == nil || !strings.Contains(err.Error(), "duplicate APP_UPDATE_BASE_URL") {
		t.Fatalf("expected duplicate configuration error, got %v", err)
	}
}
