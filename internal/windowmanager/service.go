package windowmanager

import "context"

const (
	CloseBehaviorQuit = "quit"
	CloseBehaviorHide = "hide"
	minimumWidth      = 1024
	minimumHeight     = 768
)

type Bounds struct {
	X         int
	Y         int
	Width     int
	Height    int
	Maximised bool
}

type Preferences struct {
	CloseBehavior  string
	AlwaysOnTop    bool
	RememberBounds bool
	Bounds         *Bounds
}

type Platform interface {
	Show(ctx context.Context)
	Hide(ctx context.Context)
	Quit(ctx context.Context)
	Unminimise(ctx context.Context)
	Maximise(ctx context.Context)
	SetAlwaysOnTop(ctx context.Context, enabled bool)
	SetPosition(ctx context.Context, x int, y int)
	GetPosition(ctx context.Context) (x int, y int)
	SetSize(ctx context.Context, width int, height int)
	GetSize(ctx context.Context) (width int, height int)
	IsMaximised(ctx context.Context) bool
}

type Service struct {
	platform Platform
}

func NewService(platform Platform) *Service {
	return &Service{platform: platform}
}

func (s *Service) Restore(ctx context.Context, preferences Preferences) {
	s.platform.SetAlwaysOnTop(ctx, preferences.AlwaysOnTop)
	if !preferences.RememberBounds || preferences.Bounds == nil {
		return
	}

	bounds := preferences.Bounds
	if bounds.Width >= minimumWidth && bounds.Height >= minimumHeight {
		s.platform.SetPosition(ctx, bounds.X, bounds.Y)
		s.platform.SetSize(ctx, bounds.Width, bounds.Height)
	}
	if bounds.Maximised {
		s.platform.Maximise(ctx)
	}
}

func (s *Service) Capture(ctx context.Context) Bounds {
	x, y := s.platform.GetPosition(ctx)
	width, height := s.platform.GetSize(ctx)

	return Bounds{
		X:         x,
		Y:         y,
		Width:     max(width, minimumWidth),
		Height:    max(height, minimumHeight),
		Maximised: s.platform.IsMaximised(ctx),
	}
}

func (s *Service) ApplyPreferences(ctx context.Context, preferences Preferences) {
	s.platform.SetAlwaysOnTop(ctx, preferences.AlwaysOnTop)
}

func (s *Service) Activate(ctx context.Context) {
	s.platform.Show(ctx)
	s.platform.Unminimise(ctx)
}

func (s *Service) Quit(ctx context.Context) {
	s.platform.Quit(ctx)
}

func (s *Service) HandleClose(ctx context.Context, closeBehavior string) bool {
	if closeBehavior != CloseBehaviorHide {
		return false
	}

	s.platform.Hide(ctx)
	return true
}
