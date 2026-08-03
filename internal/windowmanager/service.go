package windowmanager

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
	Show()
	Hide()
	Quit()
	Unminimise()
	Maximise()
	SetAlwaysOnTop(enabled bool)
	SetPosition(x int, y int)
	GetPosition() (x int, y int)
	SetSize(width int, height int)
	GetSize() (width int, height int)
	IsMaximised() bool
}

type Service struct {
	platform Platform
}

func NewService(platform Platform) *Service {
	return &Service{platform: platform}
}

func (s *Service) Restore(preferences Preferences) {
	s.platform.SetAlwaysOnTop(preferences.AlwaysOnTop)
	if !preferences.RememberBounds || preferences.Bounds == nil {
		return
	}

	bounds := preferences.Bounds
	if bounds.Width >= minimumWidth && bounds.Height >= minimumHeight {
		s.platform.SetPosition(bounds.X, bounds.Y)
		s.platform.SetSize(bounds.Width, bounds.Height)
	}
	if bounds.Maximised {
		s.platform.Maximise()
	}
}

func (s *Service) Capture() Bounds {
	x, y := s.platform.GetPosition()
	width, height := s.platform.GetSize()

	return Bounds{
		X:         x,
		Y:         y,
		Width:     max(width, minimumWidth),
		Height:    max(height, minimumHeight),
		Maximised: s.platform.IsMaximised(),
	}
}

func (s *Service) ApplyPreferences(preferences Preferences) {
	s.platform.SetAlwaysOnTop(preferences.AlwaysOnTop)
}

func (s *Service) Activate() {
	s.platform.Unminimise()
	s.platform.Show()
}

func (s *Service) Quit() {
	s.platform.Quit()
}

func (s *Service) HandleClose(closeBehavior string) bool {
	if closeBehavior != CloseBehaviorHide {
		return false
	}

	s.platform.Hide()
	return true
}
