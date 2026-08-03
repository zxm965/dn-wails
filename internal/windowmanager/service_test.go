package windowmanager

import (
	"testing"
)

type platformStub struct {
	positionX   int
	positionY   int
	width       int
	height      int
	maximised   bool
	alwaysOnTop bool
	hidden      bool
	shown       bool
	unminimised bool
}

func (p *platformStub) Show()                       { p.shown = true }
func (p *platformStub) Hide()                       { p.hidden = true }
func (p *platformStub) Quit()                       {}
func (p *platformStub) Unminimise()                 { p.unminimised = true }
func (p *platformStub) Maximise()                   { p.maximised = true }
func (p *platformStub) SetAlwaysOnTop(enabled bool) { p.alwaysOnTop = enabled }
func (p *platformStub) SetPosition(x int, y int)    { p.positionX, p.positionY = x, y }
func (p *platformStub) GetPosition() (int, int)     { return p.positionX, p.positionY }
func (p *platformStub) SetSize(width int, height int) {
	p.width, p.height = width, height
}
func (p *platformStub) GetSize() (int, int) { return p.width, p.height }
func (p *platformStub) IsMaximised() bool   { return p.maximised }

func TestServiceRestoresAndCapturesWindowState(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)
	service.Restore(Preferences{
		AlwaysOnTop:    true,
		RememberBounds: true,
		Bounds:         &Bounds{X: 80, Y: 60, Width: 1200, Height: 800, Maximised: true},
	})

	if platform.positionX != 80 || platform.positionY != 60 || platform.width != 1200 || platform.height != 800 {
		t.Fatalf("window bounds were not restored: %+v", platform)
	}
	if !platform.alwaysOnTop || !platform.maximised {
		t.Fatalf("window preferences were not restored: %+v", platform)
	}

	if bounds := service.Capture(); bounds.Width != 1200 || !bounds.Maximised {
		t.Fatalf("unexpected captured bounds: %+v", bounds)
	}
}

func TestServiceRejectsAndClampsBoundsBelowMinimum(t *testing.T) {
	t.Parallel()

	platform := &platformStub{width: 900, height: 700}
	service := NewService(platform)
	service.Restore(Preferences{
		RememberBounds: true,
		Bounds:         &Bounds{X: 80, Y: 60, Width: 900, Height: 700},
	})

	if platform.positionX != 0 || platform.positionY != 0 || platform.width != 900 || platform.height != 700 {
		t.Fatalf("bounds below the minimum should not be restored: %+v", platform)
	}

	bounds := service.Capture()
	if bounds.Width != minimumWidth || bounds.Height != minimumHeight {
		t.Fatalf("captured bounds were not clamped to the minimum: %+v", bounds)
	}
}

func TestServiceHidesWindowForHideCloseBehavior(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)
	if !service.HandleClose(CloseBehaviorHide) || !platform.hidden {
		t.Fatal("expected close request to hide the window")
	}
	if service.HandleClose(CloseBehaviorQuit) {
		t.Fatal("expected quit behavior to continue shutdown")
	}
}
