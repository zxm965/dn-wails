package settings

import (
	"errors"
	"testing"

	"dn-wails/internal/storage"
)

type memoryStore struct {
	data map[string][]byte
}

func newMemoryStore() *memoryStore {
	return &memoryStore{data: make(map[string][]byte)}
}

func (s *memoryStore) Load(key string) ([]byte, error) {
	data, exists := s.data[key]
	if !exists {
		return nil, storage.ErrNotFound
	}
	return append([]byte(nil), data...), nil
}

func (s *memoryStore) Save(key string, data []byte) error {
	s.data[key] = append([]byte(nil), data...)
	return nil
}

func (s *memoryStore) Delete(key string) error {
	delete(s.data, key)
	return nil
}

func (s *memoryStore) Location(string) (string, error) {
	return "memory", nil
}

func TestServiceInitializesDefaultsAndPersistsUpdates(t *testing.T) {
	t.Parallel()

	store := newMemoryStore()
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize settings: %v", err)
	}

	current := service.Get()
	if current.Appearance.ThemeMode != ThemeSystem {
		t.Fatalf("expected system theme, got %q", current.Appearance.ThemeMode)
	}

	current.Appearance.ThemeMode = ThemeDark
	current.Appearance.Accent = AccentPurple
	updated, err := service.Update(current)
	if err != nil {
		t.Fatalf("update settings: %v", err)
	}
	if updated.Appearance.ThemeMode != ThemeDark || updated.Appearance.Accent != AccentPurple {
		t.Fatalf("settings were not updated: %+v", updated.Appearance)
	}

	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatalf("reload settings: %v", err)
	}
	if reloaded.Get().Appearance.ThemeMode != ThemeDark {
		t.Fatalf("expected persisted dark theme")
	}
}

func TestServiceRejectsInvalidSettings(t *testing.T) {
	t.Parallel()

	service := NewService(newMemoryStore())
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize settings: %v", err)
	}

	value := service.Get()
	value.Appearance.FontScale = 2
	if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected invalid settings error, got %v", err)
	}
}
