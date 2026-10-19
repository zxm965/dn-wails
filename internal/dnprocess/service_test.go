package dnprocess

import (
	"errors"
	"strings"
	"testing"
)

type platformStub struct {
	items         []Info
	terminated    Target
	terminateErr  error
	launchPaths   []string
	launchErr     error
	validatedPath string
	validateErr   error
}

func (p *platformStub) List() ([]Info, error) {
	return append([]Info(nil), p.items...), nil
}

func (p *platformStub) Terminate(target Target) error {
	p.terminated = target
	return p.terminateErr
}

func (p *platformStub) Launch(path string) error {
	p.launchPaths = append(p.launchPaths, path)
	return p.launchErr
}

func (p *platformStub) ValidateLauncherPath(path string) (string, error) {
	p.validatedPath = path
	return path, p.validateErr
}

func TestValidateLauncherConfiguration(t *testing.T) {
	for _, input := range []string{"", " \t", "bad\x00path", "bad\npath", strings.Repeat("x", 4097)} {
		platform := &platformStub{}
		if _, err := NewService(platform).ValidateLauncherPath(input); !errors.Is(err, ErrInvalidTarget) || platform.validatedPath != "" {
			t.Fatalf("invalid input reached native validation: %q %v", input, err)
		}
	}
	platform := &platformStub{validateErr: ErrLaunchNotFound}
	if _, err := NewService(platform).ValidateLauncherPath(` C:\Games\DNLauncher.exe `); !errors.Is(err, ErrLaunchNotFound) || platform.validatedPath != `C:\Games\DNLauncher.exe` {
		t.Fatalf("native validation/trim failure: %+v %v", platform, err)
	}
}

func TestLaunchConfigured(t *testing.T) {
	for _, test := range []struct {
		name       string
		path       string
		items      []Info
		launchErr  error
		wantErr    error
		wantLaunch bool
	}{
		{name: "saved path", path: ` C:\Games\DragonNest.exe `, wantLaunch: true},
		{name: "platform default", wantLaunch: true},
		{name: "running target", path: `c:\games\dragonnest.exe`, items: []Info{{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}}},
		{name: "single running default", items: []Info{{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}}},
		{name: "different running target", path: `D:\Games\DragonNest.exe`, items: []Info{{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}}},
		{name: "multiple running candidates", items: []Info{{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}, {PID: 43, Name: "DragonNest.exe", Path: `D:\Games\DragonNest.exe`}}},
		{name: "unreadable candidate", items: []Info{{PID: 42, Name: "DragonNest.exe"}}, wantErr: ErrAccessDenied},
		{name: "running WeGame blocks launcher", path: `C:\Games\DNLauncher.exe`, items: []Info{{PID: 44, Name: "DragonNestWS_x64.exe", Path: `D:\WeGameApps\DragonNestWS_x64.exe`}}},
		{name: "unrelated process allows launch", path: `C:\Games\DNLauncher.exe`, items: []Info{{PID: 45, Name: "Other.exe"}}, wantLaunch: true},
		{name: "native error", launchErr: ErrLaunchNotFound, wantErr: ErrLaunchNotFound, wantLaunch: true},
		{name: "null path", path: "bad\x00path", wantErr: ErrInvalidTarget},
		{name: "oversize path", path: strings.Repeat("x", 32769), wantErr: ErrInvalidTarget},
	} {
		t.Run(test.name, func(t *testing.T) {
			platform := &platformStub{items: test.items, launchErr: test.launchErr}
			err := NewService(platform).LaunchConfigured(test.path)
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("launch error = %v, want %v", err, test.wantErr)
			}
			if (len(platform.launchPaths) == 1) != test.wantLaunch {
				t.Fatalf("unexpected launch calls: %v", platform.launchPaths)
			}
			if test.wantLaunch && platform.launchPaths[0] != strings.TrimSpace(test.path) {
				t.Fatalf("wrong launch path: %q", platform.launchPaths[0])
			}
		})
	}
	if err := NewService(nil).LaunchConfigured(""); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("unavailable platform: %v", err)
	}
}

func TestServiceDoesNotReportSuccessBeforeConfirmedExit(t *testing.T) {
	t.Parallel()
	for _, failure := range []error{ErrAccessDenied, ErrTerminationTimeout} {
		t.Run(failure.Error(), func(t *testing.T) {
			platform := &platformStub{
				items:        []Info{{PID: 42, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}},
				terminateErr: failure,
			}
			service := NewService(platform)
			info, err := service.TerminateConfigured(`C:\Games\DragonNest.exe`)
			if !errors.Is(err, failure) || info != (Info{}) {
				t.Fatalf("unconfirmed exit was reported as success: info=%+v err=%v", info, err)
			}
		})
	}
}

func TestServiceReportsInaccessibleGameInsteadOfNotFound(t *testing.T) {
	t.Parallel()
	service := NewService(&platformStub{items: []Info{
		{PID: 11, Name: "Other.exe"},
		{PID: 42, Name: "DragonNest_x64.exe"},
	}})
	if _, err := service.List(); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("inaccessible game scan lost permission error: %v", err)
	}
	if _, err := service.TerminateConfigured(""); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("inaccessible game kill lost permission error: %v", err)
	}
	service = NewService(&platformStub{items: []Info{{PID: 11, Name: "Other.exe"}}})
	if items, err := service.List(); err != nil || len(items) != 0 {
		t.Fatalf("unrelated inaccessible process blocked game scan: %v %v", items, err)
	}
}

func TestServiceListFiltersDragonNestCandidates(t *testing.T) {
	service := NewService(&platformStub{items: []Info{
		{PID: 10, Name: "DragonNest.EXE", Path: `C:\Games\DragonNest\DragonNest.exe`},
		{PID: 11, Name: "DragonNest_X64.Exe", Path: `D:\WeGameApps\DragonNest\DragonNest_x64.exe`},
		{PID: 12, Name: "dn.exe", Path: `C:\Games\DragonNest\dn.exe`},
		{PID: 13, Name: "DragonNest_Reborn.exe", Path: `C:\Games\DragonNest\DragonNest_Reborn.exe`},
		{PID: 14, Name: "game.exe", Path: `D:\Dragon Nest\game.exe`},
	}})

	items, err := service.List()
	if err != nil {
		t.Fatalf("list candidates: %v", err)
	}
	if len(items) != 2 || items[0].PID != 10 || items[1].PID != 11 {
		t.Fatalf("unexpected candidates: %+v", items)
	}
}

func TestLauncherDetectionAndIsolation(t *testing.T) {
	launcher := Info{PID: 30, Name: "DNLauncher.EXE", Path: `C:\Games\DNLauncher.exe`}
	game := Info{PID: 31, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}
	platform := &platformStub{items: []Info{launcher, game}}
	items, err := NewService(platform).List()
	if err != nil || len(items) != 2 || DetectedLauncherPath(items) != launcher.Path {
		t.Fatalf("launcher not detected: %v %v", items, err)
	}
	items, err = NewFirefoxTestService(platform).List()
	if err != nil || len(items) != 0 {
		t.Fatalf("Windows launcher leaked into Firefox candidates: %v %v", items, err)
	}
	if DetectedLauncherPath([]Info{game}) != "" {
		t.Fatal("game executable was treated as launcher")
	}
	other := launcher
	other.PID = 32
	if DetectedLauncherPath([]Info{launcher, other}) != launcher.Path {
		t.Fatal("multiple processes at same launcher path should be unambiguous")
	}
	other.Path = `D:\Other\DNLauncher.exe`
	if DetectedLauncherPath([]Info{launcher, other}) != "" {
		t.Fatal("multiple installations must not choose an arbitrary launcher")
	}
}

func TestServiceTerminateConfiguredRequiresSingleCandidateWithoutPath(t *testing.T) {
	service := NewService(&platformStub{items: []Info{
		{PID: 10, Name: "DragonNest.exe", Path: `C:\Games\DragonNest\DragonNest.exe`},
		{PID: 12, Name: "DragonNest_x64.exe", Path: `D:\Dragon Nest\DragonNest_x64.exe`},
	}})

	if _, err := service.TerminateConfigured(""); !errors.Is(err, ErrMultiple) {
		t.Fatalf("expected multiple candidate error, got %v", err)
	}
}

func TestServiceTerminateConfiguredUsesExactPath(t *testing.T) {
	platform := &platformStub{items: []Info{
		{PID: 10, Name: "DragonNest.exe", Path: `C:\Games\DragonNest\DragonNest.exe`},
		{PID: 12, Name: "DragonNest_x64.exe", Path: `D:\Dragon Nest\DragonNest_x64.exe`},
	}}
	service := NewService(platform)

	item, err := service.TerminateConfigured(`d:\dragon nest\dragonnest_x64.exe`)
	if err != nil {
		t.Fatalf("terminate configured process: %v", err)
	}
	if item.PID != 12 || platform.terminated.PID != 12 {
		t.Fatalf("unexpected terminated process: item=%+v target=%+v", item, platform.terminated)
	}
}

func TestFirefoxTestServiceIsolatesMainProcessAndTargetPath(t *testing.T) {
	platform := &platformStub{items: []Info{
		{PID: 20, Name: "firefox", Path: "/Applications/Firefox.app/Contents/MacOS/firefox"},
		{PID: 21, Name: "plugin-container", Path: "/Applications/Firefox.app/Contents/MacOS/plugin-container"},
		{PID: 22, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`},
	}}
	service := NewFirefoxTestService(platform)
	items, err := service.List()
	if err != nil || len(items) != 1 || items[0].PID != 20 {
		t.Fatalf("unexpected Firefox candidates: %v %v", items, err)
	}
	if _, err := service.TerminateConfigured("/applications/Firefox.app/Contents/MacOS/firefox"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("macOS paths must match exactly: %v", err)
	}
	if _, err := service.Terminate(Target{PID: 22, Name: "DragonNest.exe", Path: `C:\Games\DragonNest.exe`}); !errors.Is(err, ErrInvalidTarget) {
		t.Fatalf("test mode accepted a non-Firefox target: %v", err)
	}
	if _, err := service.TerminateConfigured(""); err != nil || platform.terminated.PID != 20 {
		t.Fatalf("single Firefox termination: %+v %v", platform.terminated, err)
	}
	platform.items = append(platform.items, Info{PID: 23, Name: "firefox", Path: "/Users/test/Firefox.app/Contents/MacOS/firefox"})
	if _, err := service.TerminateConfigured(""); !errors.Is(err, ErrMultiple) {
		t.Fatalf("multiple Firefox instances were not rejected: %v", err)
	}
}

func TestDetectFirefoxLaunchPath(t *testing.T) {
	path := "/Applications/Firefox.app/Contents/MacOS/firefox"
	for _, tc := range []struct {
		name  string
		items []Info
		want  string
	}{
		{"unique", []Info{{Name: "firefox", Path: path}}, path},
		{"same installation", []Info{{Name: "firefox", Path: path}, {Name: "firefox", Path: path}}, path},
		{"unreadable", []Info{{Name: "firefox"}}, ""},
		{"helper", []Info{{Name: "plugin-container", Path: path}}, ""},
		{"multiple installations", []Info{{Name: "firefox", Path: path}, {Name: "firefox", Path: "/Other/Firefox.app/Contents/MacOS/firefox"}}, ""},
		{"case sensitive paths", []Info{{Name: "firefox", Path: path}, {Name: "firefox", Path: strings.ToLower(path)}}, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := DetectedLauncherPath(tc.items); got != tc.want {
				t.Fatalf("path=%q want %q", got, tc.want)
			}
		})
	}
}

func TestWeGameProcess(t *testing.T) {
	for _, name := range []string{"DragonNestWS_x64.exe", "DRAGONNESTWS_X64.EXE"} {
		t.Run(name, func(t *testing.T) {
			game := Info{PID: 44, Name: name, Path: `D:\WeGameApps\DragonNestWS_x64.exe`}
			platform := &platformStub{items: []Info{game}}
			service := NewService(platform)
			items, err := service.List()
			if err != nil || len(items) != 1 || items[0] != game {
				t.Fatalf("WeGame candidate missing: %v %v", items, err)
			}
			if DetectedLauncherPath(items) != "" {
				t.Fatal("WeGame game executable must not become launcher")
			}
			for _, path := range []string{"", strings.ToLower(game.Path)} {
				got, err := service.TerminateConfigured(path)
				if err != nil || got != game || platform.terminated != (Target{PID: game.PID, Name: game.Name, Path: game.Path}) {
					t.Fatalf("WeGame termination failed: %+v %v", got, err)
				}
			}
			if items, err := NewFirefoxTestService(platform).List(); err != nil || len(items) != 0 {
				t.Fatalf("WeGame leaked into macOS candidates: %v %v", items, err)
			}
			platform.items[0].Path = ""
			if _, err := service.List(); !errors.Is(err, ErrAccessDenied) {
				t.Fatalf("WeGame access denial lost: %v", err)
			}
		})
	}
}
