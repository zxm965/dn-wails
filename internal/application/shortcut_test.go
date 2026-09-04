package application

import (
	"testing"

	"cull-pear/internal/dnprocess"
	"cull-pear/internal/lifecycle"
	"cull-pear/internal/settings"
)

type shortcutSettingsStub struct {
	current settings.AppSettings
}

func (s *shortcutSettingsStub) Initialize() error { return nil }
func (s *shortcutSettingsStub) Get() settings.AppSettings {
	return s.current
}
func (s *shortcutSettingsStub) Update(next settings.AppSettings) (settings.AppSettings, error) {
	s.current = next
	return next, nil
}
func (s *shortcutSettingsStub) Reset() (settings.AppSettings, error) {
	s.current = settings.Default()
	return s.current, nil
}
func (*shortcutSettingsStub) UpdateWindowBounds(settings.WindowBounds) error { return nil }

type globalShortcutStub struct {
	registered   []string
	unregistered []string
	callbacks    map[string]func()
}

func (s *globalShortcutStub) Register(accelerator string, callback func()) error {
	s.registered = append(s.registered, accelerator)
	if s.callbacks == nil {
		s.callbacks = make(map[string]func())
	}
	s.callbacks[accelerator] = callback
	return nil
}

func (s *globalShortcutStub) Unregister(accelerator string) error {
	s.unregistered = append(s.unregistered, accelerator)
	delete(s.callbacks, accelerator)
	return nil
}

type shortcutDnProcessStub struct {
	configuredPath string
	terminated     bool
}

func (*shortcutDnProcessStub) List() ([]dnprocess.Info, error) { return nil, nil }
func (*shortcutDnProcessStub) Terminate(target dnprocess.Target) (dnprocess.Info, error) {
	return dnprocess.Info{PID: target.PID, Name: target.Name, Path: target.Path}, nil
}
func (s *shortcutDnProcessStub) TerminateConfigured(path string) (dnprocess.Info, error) {
	s.configuredPath = path
	s.terminated = true
	return dnprocess.Info{PID: 42, Name: "DragonNest.exe", Path: path}, nil
}
func (*shortcutDnProcessStub) Health() error { return nil }

func TestRuntimeReadyRegistersConfiguredDragonNestGlobalShortcut(t *testing.T) {
	t.Parallel()

	current := settings.Default()
	current.DragonNest.ShortcutEnabled = true
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	settingsService := &shortcutSettingsStub{current: current}
	shortcutService := &globalShortcutStub{}
	processService := &shortcutDnProcessStub{}
	lifecycleService := lifecycle.NewService()
	notificationService := &runtimeReadyNotificationStub{lifecycle: lifecycleService}
	app := New(Dependencies{
		GlobalShortcut:     shortcutService,
		SystemNotification: notificationService,
		Settings:           settingsService,
		Lifecycle:          lifecycleService,
		Window:             runtimeReadyWindowStub{},
		DnProcess:          processService,
	})

	app.RuntimeReady()

	if len(shortcutService.registered) != 1 || shortcutService.registered[0] != "Ctrl+F4" {
		t.Fatalf("expected Ctrl+F4 to be registered after runtime ready, got %v", shortcutService.registered)
	}
	callback := shortcutService.callbacks["Ctrl+F4"]
	if callback == nil {
		t.Fatal("expected the registered shortcut callback")
	}
	callback()
	if !processService.terminated || processService.configuredPath != current.DragonNest.TargetPath {
		t.Fatalf("shortcut did not terminate the configured process: %+v", processService)
	}
}

func TestSyncDragonNestShortcutReplacesCompleteAccelerator(t *testing.T) {
	t.Parallel()

	shortcutService := &globalShortcutStub{}
	app := New(Dependencies{GlobalShortcut: shortcutService})
	if err := app.syncDragonNestShortcut(settings.DragonNest{
		ShortcutEnabled: true,
		ShortcutKey:     "Ctrl+F4",
	}); err != nil {
		t.Fatalf("register initial shortcut: %v", err)
	}
	if err := app.syncDragonNestShortcut(settings.DragonNest{
		ShortcutEnabled: true,
		ShortcutKey:     "Ctrl+F5",
	}); err != nil {
		t.Fatalf("replace shortcut: %v", err)
	}

	if len(shortcutService.unregistered) != 1 || shortcutService.unregistered[0] != "Ctrl+F4" {
		t.Fatalf("expected Ctrl+F4 to be unregistered, got %v", shortcutService.unregistered)
	}
	if len(shortcutService.registered) != 2 || shortcutService.registered[1] != "Ctrl+F5" {
		t.Fatalf("expected Ctrl+F5 to be registered, got %v", shortcutService.registered)
	}
}
