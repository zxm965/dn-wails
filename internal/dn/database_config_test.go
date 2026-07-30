package dn

import (
	"strings"
	"testing"
)

func TestResolveDatabaseURLUsesProcessEnvironment(t *testing.T) {
	t.Setenv(databaseURLKey, "postgres://environment.example/database")

	got, err := ResolveDatabaseURL([]byte("DATABASE_URL=postgres://embedded.example/database\n"))
	if err != nil {
		t.Fatalf("resolve database URL: %v", err)
	}
	if got != "postgres://environment.example/database" {
		t.Fatalf("expected process environment URL, got %q", got)
	}
}

func TestResolveDatabaseURLUsesEmbeddedProjectEnvironment(t *testing.T) {
	t.Setenv(databaseURLKey, "")

	got, err := ResolveDatabaseURL([]byte("APP_DISPLAY_NAME=DN\nDATABASE_URL='postgres://project.example/database'\n"))
	if err != nil {
		t.Fatalf("resolve database URL: %v", err)
	}
	if got != "postgres://project.example/database" {
		t.Fatalf("expected embedded project URL, got %q", got)
	}
}

func TestResolveDatabaseURLRequiresCurrentProjectConfiguration(t *testing.T) {
	t.Setenv(databaseURLKey, "")

	_, err := ResolveDatabaseURL([]byte("APP_DISPLAY_NAME=DN\n"))
	if err == nil || !strings.Contains(err.Error(), "dn-wails/.env.local") {
		t.Fatalf("expected current project configuration error, got %v", err)
	}
}

func TestReadDatabaseURLRejectsDuplicates(t *testing.T) {
	_, err := readDatabaseURL([]byte("DATABASE_URL=postgres://first\nDATABASE_URL=postgres://second\n"))
	if err == nil || !strings.Contains(err.Error(), "duplicate DATABASE_URL") {
		t.Fatalf("expected duplicate configuration error, got %v", err)
	}
}
