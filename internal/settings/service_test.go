package settings

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"cull-pear/internal/storage"
)

func TestServiceRejectsPreviousSettingsWithoutRewriting(t *testing.T) {
	for _, version := range []int{0, 7, 8, 9, 10, CurrentVersion + 1} {
		store := newMemoryStore()
		previous := Default()
		previous.Version = version
		data, _ := json.Marshal(previous)
		store.data[storageKey] = data
		if err := NewService(store).Initialize(); !errors.Is(err, ErrInvalidSettings) {
			t.Fatalf("version %d: %v", version, err)
		}
		if !bytes.Equal(data, store.data[storageKey]) {
			t.Fatalf("version %d was overwritten", version)
		}
	}
}

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
	current.DragonNest.LauncherPath = `C:\Games\DNLauncher.exe`
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
	if reloaded.Get().DragonNest.LauncherPath != current.DragonNest.LauncherPath {
		t.Fatal("launcher path was not persisted")
	}
}

func TestServiceRejectsInvalidSettings(t *testing.T) {
	t.Parallel()

	service := NewService(newMemoryStore())
	if err := service.Initialize(); err != nil {
		t.Fatalf("initialize settings: %v", err)
	}

	value := service.Get()
	value.Appearance.FontSizePreset = "xl"
	if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected invalid settings error, got %v", err)
	}

	value.Appearance.FontSizePreset = FontSizeMD
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

func TestLocalShortcutConfiguration(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	if service.Get().DragonNest.LocalShortcutKey != "F4" {
		t.Fatal("default shortcut must be F4")
	}
	for i := 1; i <= 12; i++ {
		value := service.Get()
		value.DragonNest.LocalShortcutKey = fmt.Sprintf("F%d", i)
		if _, err := service.Update(value); err != nil {
			t.Fatalf("%s rejected: %v", value.DragonNest.LocalShortcutKey, err)
		}
	}
	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatal(err)
	}
	if reloaded.Get().DragonNest.LocalShortcutKey != "F12" {
		t.Fatal("configured key was not persisted")
	}
	for _, key := range []string{"", "F0", "F13", "F04", "f4", "Ctrl+F4", "Fn+F4"} {
		value := service.Get()
		value.DragonNest.LocalShortcutKey = key
		if _, err := service.Update(value); !errors.Is(err, ErrInvalidSettings) {
			t.Fatalf("invalid key %q accepted: %v", key, err)
		}
	}
	reset, err := service.Reset()
	if err != nil || reset.DragonNest.LocalShortcutKey != "F4" {
		t.Fatalf("reset: %+v %v", reset, err)
	}
}

func TestGlobalShortcutPreferencesPersist(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	value := service.Get()
	if !value.DragonNest.GlobalShortcutEnabled || !value.DragonNest.GameShortcutMode {
		t.Fatal("new settings must enable global shortcut and game mode")
	}
	value.DragonNest.GlobalShortcutEnabled = false
	value.DragonNest.GameShortcutMode = false
	value.DragonNest.LocalShortcutKey = "Ctrl+Shift+F4"
	if _, err := service.Update(value); err != nil {
		t.Fatal(err)
	}
	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatal(err)
	}
	if reloaded.Get().DragonNest != value.DragonNest {
		t.Fatal("global shortcut preferences not persisted")
	}
	reset, err := reloaded.Reset()
	if err != nil {
		t.Fatal(err)
	}
	if !reset.DragonNest.GlobalShortcutEnabled || !reset.DragonNest.GameShortcutMode ||
		reset.DragonNest.LocalShortcutKey != DefaultLocalShortcutKey {
		t.Fatal("reset must restore enabled global shortcut and game mode with F4")
	}
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	if service.Get().DragonNest != reset.DragonNest {
		t.Fatal("reset shortcut defaults not persisted")
	}
}

func TestMenuOrderPersistsAndIsIsolated(t *testing.T) {
	store := newMemoryStore()
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	value := service.Get()
	value.Navigation.MenuOrder = map[string][]string{
		"main-navigation": {"tasks", "calendar"},
		"dn-system":       {"dn-kill-process", "dn-weekly", "dn-roles"},
	}
	value.Navigation.MenuVisibility["tasks"] = false
	updated, err := service.Update(value)
	if err != nil {
		t.Fatal(err)
	}
	value.Navigation.MenuOrder["main-navigation"][0] = "changed-input"
	updated.Navigation.MenuOrder["main-navigation"][0] = "changed-output"
	read := service.Get()
	delete(read.Navigation.MenuOrder, "dn-system")
	read.Navigation.MenuOrder["main-navigation"][0] = "changed-read"
	reloaded := NewService(store)
	if err := reloaded.Initialize(); err != nil {
		t.Fatal(err)
	}
	want := map[string][]string{"main-navigation": {"tasks", "calendar"}, "dn-system": {"dn-kill-process", "dn-weekly", "dn-roles"}}
	for _, actual := range []AppSettings{service.Get(), reloaded.Get()} {
		if !reflect.DeepEqual(actual.Navigation.MenuOrder, want) {
			t.Fatalf("order not isolated/persisted: %+v", actual.Navigation.MenuOrder)
		}
	}
	reset := service.Get()
	reset.Navigation.MenuOrder = map[string][]string{}
	if _, err := service.Update(reset); err != nil {
		t.Fatal(err)
	}
	if len(service.Get().Navigation.MenuOrder) != 0 || service.Get().Navigation.MenuVisibility["tasks"] {
		t.Fatal("reset order must preserve visibility")
	}
}

func TestMenuOrderValidation(t *testing.T) {
	tooManyGroups := make(map[string][]string)
	for i := 0; i < 33; i++ {
		tooManyGroups[fmt.Sprint(i)] = []string{}
	}
	for _, test := range []struct {
		name    string
		order   map[string][]string
		invalid bool
	}{
		{"unset", nil, false},
		{"default", map[string][]string{}, false},
		{"empty group", map[string][]string{"main-navigation": {}}, false},
		{"blank group", map[string][]string{"": {}}, true},
		{"padded group", map[string][]string{" main-navigation": {}}, true},
		{"long group", map[string][]string{strings.Repeat("a", 65): {}}, true},
		{"blank key", map[string][]string{"main-navigation": {""}}, true},
		{"padded key", map[string][]string{"main-navigation": {"tasks "}}, true},
		{"long key", map[string][]string{"main-navigation": {strings.Repeat("a", 65)}}, true},
		{"duplicate", map[string][]string{"main-navigation": {"tasks", "tasks"}}, true},
		{"too many entries", map[string][]string{"main-navigation": make([]string, 129)}, true},
		{"too many groups", tooManyGroups, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			store := newMemoryStore()
			service := NewService(store)
			if err := service.Initialize(); err != nil {
				t.Fatal(err)
			}
			before := append([]byte{}, store.data[storageKey]...)
			value := service.Get()
			value.Navigation.MenuOrder = test.order
			_, err := service.Update(value)
			if test.invalid {
				if !errors.Is(err, ErrInvalidSettings) {
					t.Fatalf("expected invalid settings: %v", err)
				}
				if !bytes.Equal(before, store.data[storageKey]) {
					t.Fatal("invalid order changed persisted settings")
				}
			} else if err != nil {
				t.Fatal(err)
			}
		})
	}
}

type failingSettingsStore struct {
	*memoryStore
	fail bool
}

func (s *failingSettingsStore) Save(key string, data []byte) error {
	if s.fail {
		return errors.New("disk unavailable")
	}
	return s.memoryStore.Save(key, data)
}

func TestMenuOrderSaveFailurePreservesLastSavedOrder(t *testing.T) {
	store := &failingSettingsStore{memoryStore: newMemoryStore()}
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	value := service.Get()
	value.Navigation.MenuOrder["main-navigation"] = []string{"tasks", "calendar"}
	if _, err := service.Update(value); err != nil {
		t.Fatal(err)
	}
	store.fail = true
	value.Navigation.MenuOrder["main-navigation"] = []string{"calendar", "tasks"}
	if _, err := service.Update(value); err == nil {
		t.Fatal("expected failed save")
	}
	if got := service.Get().Navigation.MenuOrder["main-navigation"][0]; got != "tasks" {
		t.Fatalf("failed save changed state: %s", got)
	}
}

func TestFontSizePresets(t *testing.T) {
	for _, preset := range []string{FontSizeSM, FontSizeMD, FontSizeLG} {
		t.Run(preset, func(t *testing.T) {
			store := newMemoryStore()
			service := NewService(store)
			if err := service.Initialize(); err != nil {
				t.Fatal(err)
			}
			if service.Get().Appearance.FontSizePreset != FontSizeMD {
				t.Fatal("default font size must be md")
			}
			next := service.Get()
			next.Appearance.FontSizePreset = preset
			if _, err := service.Update(next); err != nil {
				t.Fatal(err)
			}
			reloaded := NewService(store)
			if err := reloaded.Initialize(); err != nil {
				t.Fatal(err)
			}
			if reloaded.Get().Appearance.FontSizePreset != preset {
				t.Fatal("font size preset did not persist")
			}
			reset, err := reloaded.Reset()
			if err != nil || reset.Appearance.FontSizePreset != FontSizeMD {
				t.Fatalf("reset: %+v, %v", reset.Appearance, err)
			}
		})
	}
	for _, preset := range []string{"", "xl", "MD", " md", "1.25"} {
		t.Run("invalid_"+preset, func(t *testing.T) {
			store := newMemoryStore()
			service := NewService(store)
			if err := service.Initialize(); err != nil {
				t.Fatal(err)
			}
			before := append([]byte(nil), store.data[storageKey]...)
			next := service.Get()
			next.Appearance.FontSizePreset = preset
			if _, err := service.Update(next); !errors.Is(err, ErrInvalidSettings) {
				t.Fatalf("invalid preset accepted: %v", err)
			}
			if !bytes.Equal(before, store.data[storageKey]) || service.Get().Appearance.FontSizePreset != FontSizeMD {
				t.Fatal("rejected update changed settings")
			}
		})
	}
}

func TestMissingFontSizeUsesDefaultWithoutResettingPreferences(t *testing.T) {
	store := newMemoryStore()
	saved := Default()
	saved.Appearance.ThemeMode = ThemeDark
	saved.Navigation.MenuVisibility["devtools"] = true
	saved.Navigation.MenuOrder["main"] = []string{"tasks", "calendar"}
	data, err := json.Marshal(saved)
	if err != nil {
		t.Fatal(err)
	}
	data = bytes.Replace(data, []byte(`"fontSizePreset":"md"`), []byte(`"fontScale":1.25`), 1)
	store.data[storageKey] = data
	service := NewService(store)
	if err := service.Initialize(); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(service.Get(), saved) {
		t.Fatalf("other preferences changed: %+v", service.Get())
	}
	if !bytes.Equal(data, store.data[storageKey]) {
		t.Fatal("initialization rewrote saved settings")
	}
	if _, err := service.Update(service.Get()); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(store.data[storageKey], []byte("fontScale")) {
		t.Fatal("obsolete font scale persisted")
	}
}
