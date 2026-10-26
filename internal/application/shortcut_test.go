package application

import (
	"errors"
	"testing"

	"cull-pear/internal/dnprocess"
	"cull-pear/internal/settings"
)

type shortcutSettingsStub struct {
	current   settings.AppSettings
	updateErr error
}

func (s *shortcutSettingsStub) Initialize() error { return nil }
func (s *shortcutSettingsStub) Get() settings.AppSettings {
	return s.current
}
func (s *shortcutSettingsStub) Update(next settings.AppSettings) (settings.AppSettings, error) {
	if s.updateErr != nil {
		return settings.AppSettings{}, s.updateErr
	}
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
	launched       bool
	items          []dnprocess.Info
	validationErr  error
}

func (s *shortcutDnProcessStub) List() ([]dnprocess.Info, error) { return s.items, nil }
func (*shortcutDnProcessStub) Terminate(target dnprocess.Target) (dnprocess.Info, error) {
	return dnprocess.Info{PID: target.PID, Name: target.Name, Path: target.Path}, nil
}
func (s *shortcutDnProcessStub) TerminateConfigured(path string) (dnprocess.Info, error) {
	s.configuredPath = path
	s.terminated = true
	return dnprocess.Info{PID: 42, Name: "DragonNest.exe", Path: path}, nil
}
func (*shortcutDnProcessStub) Health() error { return nil }

func (s *shortcutDnProcessStub) LaunchConfigured(path string) error {
	s.configuredPath = path
	s.launched = true
	return nil
}

func (s *shortcutDnProcessStub) ValidateLauncherPath(path string) (string, error) {
	return path, s.validationErr
}

func TestSaveLauncherPathPreservesPreferencesAndReportsFailures(t *testing.T) {
	current := settings.Default()
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	preferences := &shortcutSettingsStub{current: current}
	process := &shortcutDnProcessStub{}
	app := New(Dependencies{Settings: preferences, DnProcess: process})
	for _, path := range []string{`C:\Games\DNLauncher.exe`, `D:\Other\DNLauncher.exe`} {
		saved, err := app.SaveDragonNestLauncherPath(DnLauncherConfiguration{Path: path})
		if err != nil || saved.Path != path || preferences.current.DragonNest.LauncherPath != path || preferences.current.DragonNest.TargetPath != current.DragonNest.TargetPath {
			t.Fatalf("save path failed: %+v %+v %v", saved, preferences.current.DragonNest, err)
		}
	}
	process.items = []dnprocess.Info{{PID: 20, Name: "DNLauncher.exe", Path: `C:\Games\DNLauncher.exe`}}
	if _, err := app.ListDragonNestProcesses(); err != nil || preferences.current.DragonNest.LauncherPath != `D:\Other\DNLauncher.exe` {
		t.Fatalf("scan overwrote user launcher: %v", err)
	}
	before := preferences.current
	for _, failure := range []error{dnprocess.ErrInvalidTarget, dnprocess.ErrLaunchNotFound} {
		process.validationErr = failure
		if _, err := app.SaveDragonNestLauncherPath(DnLauncherConfiguration{Path: "bad"}); !errors.Is(err, failure) || preferences.current.DragonNest != before.DragonNest {
			t.Fatalf("invalid path was saved: %v", err)
		}
	}
	process.validationErr = nil
	preferences.updateErr = errors.New("disk full")
	if _, err := app.SaveDragonNestLauncherPath(DnLauncherConfiguration{Path: `E:\Games\DNLauncher.exe`}); !errors.Is(err, preferences.updateErr) || preferences.current.DragonNest != before.DragonNest {
		t.Fatalf("save failure was hidden: %v", err)
	}
}

func TestLaunchDragonNestUsesOnlyLauncherPath(t *testing.T) {
	for _, path := range []string{"", `C:\Games\DNLauncher.exe`, `/Applications/Firefox.app/Contents/MacOS/firefox`} {
		t.Run(path, func(t *testing.T) {
			current := settings.Default()
			current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
			current.DragonNest.LauncherPath = path
			process := &shortcutDnProcessStub{}
			app := New(Dependencies{Settings: &shortcutSettingsStub{current: current}, DnProcess: process})
			if err := app.LaunchDragonNestProcess(); err != nil {
				t.Fatal(err)
			}
			if !process.launched || process.configuredPath != path {
				t.Fatalf("launch fell back to termination target: %+v", process)
			}
		})
	}
}

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

func TestScanRemembersLauncherSeparatelyFromKillTarget(t *testing.T) {
	current := settings.Default()
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	launcher := dnprocess.Info{PID: 30, Name: "DNLauncher.exe", Path: `C:\Games\DNLauncher.exe`}
	process := &shortcutDnProcessStub{items: []dnprocess.Info{launcher}}
	preferences := &shortcutSettingsStub{current: current}
	app := New(Dependencies{Settings: preferences, DnProcess: process})
	if _, err := app.ListDragonNestProcesses(); err != nil {
		t.Fatal(err)
	}
	if preferences.current.DragonNest.LauncherPath != launcher.Path || preferences.current.DragonNest.TargetPath != current.DragonNest.TargetPath {
		t.Fatalf("scan changed wrong path: %+v", preferences.current.DragonNest)
	}
	if err := app.LaunchDragonNestProcess(); err != nil || process.configuredPath != launcher.Path {
		t.Fatalf("launch did not prefer launcher: %+v %v", process, err)
	}
	if _, err := app.KillDragonNestProcess(); err != nil || process.configuredPath != current.DragonNest.TargetPath {
		t.Fatalf("kill did not preserve game target: %+v %v", process, err)
	}
	process.items = append(process.items, dnprocess.Info{PID: 31, Name: "DNLauncher.exe", Path: `D:\Games\DNLauncher.exe`})
	if _, err := app.ListDragonNestProcesses(); err != nil || preferences.current.DragonNest.LauncherPath != launcher.Path {
		t.Fatalf("ambiguous scan overwrote launcher: %+v %v", preferences.current.DragonNest, err)
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
	if err := app.LaunchDragonNestProcess(); !errors.Is(err, dnprocess.ErrBusy) {
		t.Fatalf("launch overlap: %v", err)
	}
}

type processWindowStub struct {
	calls int
	err   error
}

type globalShortcutNativeStub struct {
	starts   int
	stops    int
	key      string
	gameMode bool
	fire     func()
}

func (n *globalShortcutNativeStub) Start(key string, gameMode bool, fire func(), _ func(error)) (func() error, error) {
	n.starts++
	n.key, n.gameMode, n.fire = key, gameMode, fire
	return func() error { n.stops++; return nil }, nil
}

func TestGlobalShortcutReadySettingsAndBackgroundExecution(t *testing.T) {
	current := settings.Default()
	current.DragonNest.TargetPath = `C:\Games\DragonNest.exe`
	preferences := &shortcutSettingsStub{current: current}
	process := &shortcutDnProcessStub{}
	native := &globalShortcutNativeStub{}
	app := New(Dependencies{Settings: preferences, DnProcess: process, Shortcut: native, Window: runtimeReadyWindowStub{}})
	app.syncDragonNestShortcut()
	if native.starts != 0 {
		t.Fatal("registered before runtime ready")
	}
	app.runtimeReady = true
	app.syncDragonNestShortcut()
	if native.starts != 1 || native.key != "F4" || !native.gameMode {
		t.Fatal("default shortcut and game mode not registered after runtime ready")
	}
	// No React window or frontend key event participates in this execution.
	native.fire()
	if !process.terminated || process.configuredPath != current.DragonNest.TargetPath ||
		app.GetDragonNestShortcutStatus().TriggerCount != 1 {
		t.Fatal("background execution did not use configured target")
	}
	next := preferences.Get()
	next.DragonNest.LocalShortcutKey = "Ctrl+Shift+F4"
	next.DragonNest.GameShortcutMode = false
	preferences.updateErr = errors.New("disk full")
	if _, err := app.UpdateSettings(next); err == nil || native.starts != 1 {
		t.Fatal("failed persistence changed active shortcut")
	}
	preferences.updateErr = nil
	if _, err := app.UpdateSettings(next); err != nil {
		t.Fatal(err)
	}
	if native.key != "Ctrl+Shift+F4" || native.gameMode || native.starts != 2 || native.stops != 1 {
		t.Fatal("configuration not applied")
	}
	if _, err := app.ResetSettings(); err != nil {
		t.Fatal(err)
	}
	if !app.GetDragonNestShortcutStatus().Enabled || native.key != "F4" || !native.gameMode ||
		native.starts != 3 || native.stops != 2 {
		t.Fatal("reset did not restore enabled global shortcut and game mode")
	}
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
	current.DragonNest.LauncherPath = `C:\Games\DNLauncher.exe`
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
	if updated.DragonNest.LauncherPath != current.DragonNest.LauncherPath {
		t.Fatal("stale preferences lost launcher path")
	}
}
