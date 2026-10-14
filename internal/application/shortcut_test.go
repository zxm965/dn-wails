package application

import (
	"errors"
	"testing"

	"cull-pear/internal/dnprocess"
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

func TestKillDragonNestUsesRememberedTarget(t *testing.T) {
	current := settings.Default()
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	process := &shortcutDnProcessStub{}
	app := New(Dependencies{Settings: &shortcutSettingsStub{current: current}, DnProcess: process})
	if _, err := app.KillDragonNestProcess(); err != nil {
		t.Fatal(err)
	}
	if !process.terminated || process.configuredPath != current.DragonNest.TargetPath {
		t.Fatalf("wrong target: %+v", process)
	}
}

func TestProcessOperationsRejectOverlapAcrossWindows(t *testing.T) {
	app := New(Dependencies{})
	app.dnProcessMu.Lock()
	defer app.dnProcessMu.Unlock()
	if _, err := app.KillDragonNestProcess(); !errors.Is(err, dnprocess.ErrBusy) {
		t.Fatalf("shortcut overlap: %v", err)
	}
	if _, err := app.TerminateDragonNestProcess(dnprocess.Target{}); !errors.Is(err, dnprocess.ErrBusy) {
		t.Fatalf("manual overlap: %v", err)
	}
}

type processWindowStub struct {
	calls int
	err   error
}

func (w *processWindowStub) Open() error { w.calls++; return w.err }

func TestOpenProcessWindow(t *testing.T) {
	app := New(Dependencies{})
	if err := app.OpenDragonNestProcessWindow(); !errors.Is(err, dnprocess.ErrUnavailable) {
		t.Fatalf("unavailable: %v", err)
	}
	failure := errors.New("cannot open window")
	window := &processWindowStub{err: failure}
	app = New(Dependencies{ProcessWindow: window})
	if err := app.OpenDragonNestProcessWindow(); !errors.Is(err, failure) || window.calls != 1 {
		t.Fatalf("open error not preserved: %v", err)
	}
	window.err = nil
	if err := app.OpenDragonNestProcessWindow(); err != nil || window.calls != 2 {
		t.Fatalf("open: %v", err)
	}
}

func TestPreferenceUpdatePreservesTargetFromOtherWindow(t *testing.T) {
	current := settings.Default()
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	app := New(Dependencies{Settings: &shortcutSettingsStub{current: current}, Window: runtimeReadyWindowStub{}})
	stale := settings.Default()
	stale.Appearance.ThemeMode = settings.ThemeDark
	stale.DragonNest.LocalShortcutKey = "F12"
	updated, err := app.UpdateSettings(stale)
	if err != nil {
		t.Fatal(err)
	}
	if updated.DragonNest.TargetPath != current.DragonNest.TargetPath || updated.Appearance.ThemeMode != settings.ThemeDark || updated.DragonNest.LocalShortcutKey != "F12" {
		t.Fatalf("stale window lost target or preference: %+v", updated)
	}
}
