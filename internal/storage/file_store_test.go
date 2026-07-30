package storage

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestFileStoreSaveLoadAndDelete(t *testing.T) {
	t.Parallel()

	directory := t.TempDir()
	store := NewFileStoreAt(directory)

	expected := []byte(`{"theme":"dark"}`)
	if err := store.Save("settings", expected); err != nil {
		t.Fatalf("save value: %v", err)
	}

	actual, err := store.Load("settings")
	if err != nil {
		t.Fatalf("load value: %v", err)
	}
	if string(actual) != string(expected) {
		t.Fatalf("expected %q, got %q", expected, actual)
	}

	info, err := os.Stat(filepath.Join(directory, "settings.json"))
	if err != nil {
		t.Fatalf("stat stored value: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("expected file permissions 0600, got %o", info.Mode().Perm())
	}

	if err := store.Delete("settings"); err != nil {
		t.Fatalf("delete value: %v", err)
	}
	if _, err := store.Load("settings"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found error, got %v", err)
	}
}

func TestFileStoreRejectsInvalidKeys(t *testing.T) {
	t.Parallel()

	store := NewFileStoreAt(t.TempDir())
	for _, key := range []string{"", "../settings", "nested/settings", " settings"} {
		if err := store.Save(key, []byte("value")); !errors.Is(err, ErrInvalidKey) {
			t.Fatalf("expected invalid key error for %q, got %v", key, err)
		}
	}
}
