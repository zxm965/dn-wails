package dnprocess

import (
	"errors"
	"testing"
)

type platformStub struct {
	items        []Info
	terminated   Target
	terminateErr error
}

func (p *platformStub) List() ([]Info, error) {
	return append([]Info(nil), p.items...), nil
}

func (p *platformStub) Terminate(target Target) error {
	p.terminated = target
	return p.terminateErr
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
