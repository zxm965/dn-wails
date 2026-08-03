package dn

import (
	"errors"
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

func TestResolveDatabaseURLUsesEmbeddedLocalEnvironment(t *testing.T) {
	t.Setenv(databaseURLKey, "")

	got, err := ResolveDatabaseURL([]byte("DATABASE_URL='postgres://embedded.example/database'\n"))
	if err != nil {
		t.Fatalf("resolve embedded database URL: %v", err)
	}
	if got != "postgres://embedded.example/database" {
		t.Fatalf("expected embedded URL, got %q", got)
	}
}

func TestResolveDatabaseURLRequiresConfiguration(t *testing.T) {
	t.Setenv(databaseURLKey, "")

	_, err := ResolveDatabaseURL(nil)
	if !errors.Is(err, ErrDatabaseURLNotConfigured) {
		t.Fatalf("expected missing database configuration error, got %v", err)
	}
}

func TestReadDatabaseURLRejectsDuplicates(t *testing.T) {
	_, err := readDatabaseURL([]byte("DATABASE_URL=postgres://first\nDATABASE_URL=postgres://second\n"))
	if err == nil || !strings.Contains(err.Error(), "duplicate DATABASE_URL") {
		t.Fatalf("expected duplicate configuration error, got %v", err)
	}
}
