package windowmanager

import (
	"context"
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

func (p *platformStub) Show(context.Context)                           { p.shown = true }
func (p *platformStub) Hide(context.Context)                           { p.hidden = true }
func (p *platformStub) Quit(context.Context)                           {}
func (p *platformStub) Unminimise(context.Context)                     { p.unminimised = true }
func (p *platformStub) Maximise(context.Context)                       { p.maximised = true }
func (p *platformStub) SetAlwaysOnTop(_ context.Context, enabled bool) { p.alwaysOnTop = enabled }
func (p *platformStub) SetPosition(_ context.Context, x int, y int)    { p.positionX, p.positionY = x, y }
func (p *platformStub) GetPosition(context.Context) (int, int)         { return p.positionX, p.positionY }
func (p *platformStub) SetSize(_ context.Context, width int, height int) {
	p.width, p.height = width, height
}
func (p *platformStub) GetSize(context.Context) (int, int) { return p.width, p.height }
func (p *platformStub) IsMaximised(context.Context) bool   { return p.maximised }

func TestServiceRestoresAndCapturesWindowState(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)
	service.Restore(context.Background(), Preferences{
		AlwaysOnTop:    true,
		RememberBounds: true,
		Bounds:         &Bounds{X: 80, Y: 60, Width: 1000, Height: 700, Maximised: true},
	})

	if platform.positionX != 80 || platform.positionY != 60 || platform.width != 1000 || platform.height != 700 {
		t.Fatalf("window bounds were not restored: %+v", platform)
	}
	if !platform.alwaysOnTop || !platform.maximised {
		t.Fatalf("window preferences were not restored: %+v", platform)
	}

	if bounds := service.Capture(context.Background()); bounds.Width != 1000 || !bounds.Maximised {
		t.Fatalf("unexpected captured bounds: %+v", bounds)
	}
}

func TestServiceHidesWindowForHideCloseBehavior(t *testing.T) {
	t.Parallel()

	platform := &platformStub{}
	service := NewService(platform)
	if !service.HandleClose(context.Background(), CloseBehaviorHide) || !platform.hidden {
		t.Fatal("expected close request to hide the window")
	}
	if service.HandleClose(context.Background(), CloseBehaviorQuit) {
		t.Fatal("expected quit behavior to continue shutdown")
	}
}
