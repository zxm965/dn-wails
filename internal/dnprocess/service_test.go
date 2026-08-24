package dnprocess

import (
	"errors"
	"testing"
)

type platformStub struct {
	items      []Info
	terminated Target
}

func (p *platformStub) List() ([]Info, error) {
	return append([]Info(nil), p.items...), nil
}

func (p *platformStub) Terminate(target Target) error {
	p.terminated = target
	return nil
}

func TestServiceListFiltersDragonNestCandidates(t *testing.T) {
	service := NewService(&platformStub{items: []Info{
		{PID: 10, Name: "DragonNest.EXE", Path: `C:\Games\DragonNest\dragonnest.exe`},
		{PID: 11, Name: "notepad.exe", Path: `C:\Windows\notepad.exe`},
		{PID: 12, Name: "game.exe", Path: `D:\Dragon Nest\game.exe`},
	}})

	items, err := service.List()
	if err != nil {
		t.Fatalf("list candidates: %v", err)
	}
	if len(items) != 2 || items[0].PID != 10 || items[1].PID != 12 {
		t.Fatalf("unexpected candidates: %+v", items)
	}
}

func TestServiceTerminateConfiguredRequiresSingleCandidateWithoutPath(t *testing.T) {
	service := NewService(&platformStub{items: []Info{
		{PID: 10, Name: "dragonnest.exe", Path: `C:\Games\DragonNest\dragonnest.exe`},
		{PID: 12, Name: "dragonnestx64.exe", Path: `D:\Dragon Nest\dragonnestx64.exe`},
	}})

	if _, err := service.TerminateConfigured(""); !errors.Is(err, ErrMultiple) {
		t.Fatalf("expected multiple candidate error, got %v", err)
	}
}

func TestServiceTerminateConfiguredUsesExactPath(t *testing.T) {
	platform := &platformStub{items: []Info{
		{PID: 10, Name: "dragonnest.exe", Path: `C:\Games\DragonNest\dragonnest.exe`},
		{PID: 12, Name: "dragonnestx64.exe", Path: `D:\Dragon Nest\dragonnestx64.exe`},
	}}
	service := NewService(platform)

	item, err := service.TerminateConfigured(`d:\dragon nest\dragonnestx64.exe`)
	if err != nil {
		t.Fatalf("terminate configured process: %v", err)
	}
	if item.PID != 12 || platform.terminated.PID != 12 {
		t.Fatalf("unexpected terminated process: item=%+v target=%+v", item, platform.terminated)
	}
}
