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
	if current.Appearance.ButtonSize != ButtonSizeMD {
		t.Fatalf("expected default button size %q, got %q", ButtonSizeMD, current.Appearance.ButtonSize)
	}
	if current.Navigation.MenuVisibility == nil || len(current.Navigation.MenuVisibility) != 0 {
		t.Fatalf("expected empty default menu visibility overrides, got %+v", current.Navigation.MenuVisibility)
	}

	current.Appearance.ThemeMode = ThemeDark
	current.Appearance.Accent = AccentPurple
	current.Navigation.MenuVisibility["dn-system"] = true
	updated, err := service.Update(current)
	if err != nil {
		t.Fatalf("update settings: %v", err)
	}
	if updated.Appearance.ThemeMode != ThemeDark || updated.Appearance.Accent != AccentPurple {
		t.Fatalf("settings were not updated: %+v", updated.Appearance)
	}
	if !updated.Navigation.MenuVisibility["dn-system"] {
		t.Fatalf("menu visibility was not updated: %+v", updated.Navigation.MenuVisibility)
	}
	updated.Navigation.MenuVisibility["dn-system"] = false
	if !service.Get().Navigation.MenuVisibility["dn-system"] {
		t.Fatal("returned menu visibility must not mutate stored settings")
	}

	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatalf("reload settings: %v", err)
	}
	if reloaded.Get().Appearance.ThemeMode != ThemeDark {
		t.Fatalf("expected persisted dark theme")
	}
	if !reloaded.Get().Navigation.MenuVisibility["dn-system"] {
		t.Fatal("expected persisted menu visibility")
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

	value.Appearance.FontScale = 1
	value.Appearance.ButtonSize = "xl"
	if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected invalid button size error, got %v", err)
	}

	value.Appearance.ButtonSize = ButtonSizeMD
	value.Navigation.MenuVisibility[" invalid-key"] = true
	if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected invalid menu key error, got %v", err)
	}

	value.Navigation.MenuVisibility = nil
	if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected nil menu visibility error, got %v", err)
	}
}

func TestServiceAllowsPreferenceUpdatesWithSmallStoredWindowBounds(t *testing.T) {
	t.Parallel()

	service := NewService(newMemoryStore())
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize settings: %v", err)
	}
	if err := service.UpdateWindowBounds(WindowBounds{X: 20, Y: 30, Width: 900, Height: 700}); err != nil {
		t.Fatalf("persist window bounds: %v", err)
	}

	value := service.Get()
	value.Navigation.MenuVisibility["devtools"] = true
	updated, err := service.Update(value)
	if err != nil {
		t.Fatalf("update preferences with small stored window bounds: %v", err)
	}
	if !updated.Navigation.MenuVisibility["devtools"] {
		t.Fatal("expected menu preference to be updated")
	}
	if updated.Window.Bounds == nil || updated.Window.Bounds.Width != 900 || updated.Window.Bounds.Height != 700 {
		t.Fatalf("expected stored window bounds to be preserved: %+v", updated.Window.Bounds)
	}
}

func TestServiceRejectsOutdatedSettingsVersion(t *testing.T) {
	t.Parallel()

	store := newMemoryStore()
	store.data[storageKey] = []byte(`{"version":5}`)

	service := NewService(store)
	if err := service.Initialize(); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected outdated settings to be rejected, got %v", err)
	}
}
