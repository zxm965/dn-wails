package settings

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"cull-pear/internal/storage"
)

const storageKey = "settings"

var ErrInvalidSettings = errors.New("invalid application settings")

type Service struct {
	store storage.Store

	writeMu  sync.Mutex
	mu       sync.RWMutex
	settings AppSettings
}

func NewService(store storage.Store) *Service {
	return &Service{
		store:    store,
		settings: Default(),
	}
}

func (s *Service) Initialize() error {
	data, err := s.store.Load(storageKey)
	if errors.Is(err, storage.ErrNotFound) {
		return s.persist(Default())
	}
	if err != nil {
		return fmt.Errorf("load application settings: %w", err)
	}

	var loaded AppSettings
	if err := json.Unmarshal(data, &loaded); err != nil {
		return fmt.Errorf("decode application settings: %w", err)
	}
	if loaded.Appearance.FontSizePreset == "" {
		loaded.Appearance.FontSizePreset = FontSizeMD
	}
	if err := validate(loaded); err != nil {
		return err
	}

	s.mu.Lock()
	s.settings = clone(loaded)
	s.mu.Unlock()

	return nil
}

func (s *Service) Get() AppSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return clone(s.settings)
}

func (s *Service) Update(next AppSettings) (AppSettings, error) {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	next.Version = CurrentVersion
	if err := validate(next); err != nil {
		return AppSettings{}, err
	}
	if err := s.persistLocked(next); err != nil {
		return AppSettings{}, err
	}

	return s.Get(), nil
}

func (s *Service) Reset() (AppSettings, error) {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	defaults := Default()
	if err := s.persistLocked(defaults); err != nil {
		return AppSettings{}, err
	}

	return s.Get(), nil
}

func (s *Service) UpdateWindowBounds(bounds WindowBounds) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	s.mu.RLock()
	next := clone(s.settings)
	s.mu.RUnlock()

	next.Window.Bounds = &bounds
	return s.persistLocked(next)
}

func (s *Service) persist(next AppSettings) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	return s.persistLocked(next)
}

func (s *Service) persistLocked(next AppSettings) error {
	data, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		return fmt.Errorf("encode application settings: %w", err)
	}
	if err := s.store.Save(storageKey, data); err != nil {
		return fmt.Errorf("persist application settings: %w", err)
	}

	s.mu.Lock()
	s.settings = clone(next)
	s.mu.Unlock()

	return nil
}

func validate(value AppSettings) error {
	if value.Version != CurrentVersion {
		return fmt.Errorf("%w: unsupported version %d", ErrInvalidSettings, value.Version)
	}
	if !contains([]string{ThemeSystem, ThemeLight, ThemeDark}, value.Appearance.ThemeMode) {
		return fmt.Errorf("%w: unsupported theme %q", ErrInvalidSettings, value.Appearance.ThemeMode)
	}
	if !contains([]string{AccentGreen, AccentBlue, AccentPurple, AccentOrange}, value.Appearance.Accent) {
		return fmt.Errorf("%w: unsupported accent %q", ErrInvalidSettings, value.Appearance.Accent)
	}
	if !contains([]string{DensityComfortable, DensityCompact}, value.Appearance.Density) {
		return fmt.Errorf("%w: unsupported density %q", ErrInvalidSettings, value.Appearance.Density)
	}
	if !contains([]string{ButtonSizeSM, ButtonSizeMD, ButtonSizeLG}, value.Appearance.ButtonSize) {
		return fmt.Errorf("%w: unsupported button size %q", ErrInvalidSettings, value.Appearance.ButtonSize)
	}
	if !contains([]string{FontSizeSM, FontSizeMD, FontSizeLG}, value.Appearance.FontSizePreset) {
		return fmt.Errorf("%w: unsupported font size preset %q", ErrInvalidSettings, value.Appearance.FontSizePreset)
	}
	if value.Navigation.MenuVisibility == nil {
		return fmt.Errorf("%w: menu visibility must be an object", ErrInvalidSettings)
	}
	for key := range value.Navigation.MenuVisibility {
		if strings.TrimSpace(key) != key || key == "" || len(key) > 64 {
			return fmt.Errorf("%w: invalid menu key %q", ErrInvalidSettings, key)
		}
	}
	if len(value.Navigation.MenuOrder) > 32 {
		return fmt.Errorf("%w: too many menu order groups", ErrInvalidSettings)
	}
	for group, keys := range value.Navigation.MenuOrder {
		if strings.TrimSpace(group) != group || group == "" || len(group) > 64 || len(keys) > 128 {
			return fmt.Errorf("%w: invalid menu order group %q", ErrInvalidSettings, group)
		}
		seen := make(map[string]bool, len(keys))
		for _, key := range keys {
			if strings.TrimSpace(key) != key || key == "" || len(key) > 64 || seen[key] {
				return fmt.Errorf("%w: invalid or duplicate menu order key %q", ErrInvalidSettings, key)
			}
			seen[key] = true
		}
	}
	if !contains([]string{CloseBehaviorQuit, CloseBehaviorHide}, value.Window.CloseBehavior) {
		return fmt.Errorf("%w: unsupported close behavior %q", ErrInvalidSettings, value.Window.CloseBehavior)
	}
	if !contains([]string{"F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Ctrl+Shift+F4"}, value.DragonNest.LocalShortcutKey) {
		return fmt.Errorf("%w: unsupported shortcut %q", ErrInvalidSettings, value.DragonNest.LocalShortcutKey)
	}
	if len(value.DragonNest.TargetPath) > 4096 || strings.ContainsAny(value.DragonNest.TargetPath, "\r\n") {
		return fmt.Errorf("%w: invalid Dragon Nest target path", ErrInvalidSettings)
	}
	if len(value.DragonNest.LauncherPath) > 4096 || strings.ContainsAny(value.DragonNest.LauncherPath, "\r\n\x00") {
		return fmt.Errorf("%w: invalid Dragon Nest launcher path", ErrInvalidSettings)
	}

	return nil
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func clone(value AppSettings) AppSettings {
	result := value
	result.Navigation.MenuVisibility = make(map[string]bool, len(value.Navigation.MenuVisibility))
	for key, visible := range value.Navigation.MenuVisibility {
		result.Navigation.MenuVisibility[key] = visible
	}
	result.Navigation.MenuOrder = make(map[string][]string, len(value.Navigation.MenuOrder))
	for group, keys := range value.Navigation.MenuOrder {
		result.Navigation.MenuOrder[group] = append([]string{}, keys...)
	}
	if value.Window.Bounds != nil {
		bounds := *value.Window.Bounds
		result.Window.Bounds = &bounds
	}
	return result
}
