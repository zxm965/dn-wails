package settings

const CurrentVersion = 5

const (
	ThemeSystem = "system"
	ThemeLight  = "light"
	ThemeDark   = "dark"

	AccentGreen  = "green"
	AccentBlue   = "blue"
	AccentPurple = "purple"
	AccentOrange = "orange"

	DensityComfortable = "comfortable"
	DensityCompact     = "compact"

	ButtonSizeSM = "sm"
	ButtonSizeMD = "md"
	ButtonSizeLG = "lg"

	CloseBehaviorQuit = "quit"
	CloseBehaviorHide = "hide"
)

type Appearance struct {
	ThemeMode  string  `json:"themeMode"`
	Accent     string  `json:"accent"`
	Density    string  `json:"density"`
	ButtonSize string  `json:"buttonSize"`
	FontScale  float64 `json:"fontScale"`
}

type Notifications struct {
	Enabled      bool `json:"enabled"`
	ShowPreview  bool `json:"showPreview"`
	DoNotDisturb bool `json:"doNotDisturb"`
}

type WindowBounds struct {
	X         int  `json:"x"`
	Y         int  `json:"y"`
	Width     int  `json:"width"`
	Height    int  `json:"height"`
	Maximised bool `json:"maximised"`
}

type Window struct {
	CloseBehavior  string        `json:"closeBehavior"`
	AlwaysOnTop    bool          `json:"alwaysOnTop"`
	RememberBounds bool          `json:"rememberBounds"`
	Bounds         *WindowBounds `json:"bounds,omitempty"`
}

type AppSettings struct {
	Version       int           `json:"version"`
	Appearance    Appearance    `json:"appearance"`
	Notifications Notifications `json:"notifications"`
	Window        Window        `json:"window"`
}

func Default() AppSettings {
	return AppSettings{
		Version: CurrentVersion,
		Appearance: Appearance{
			ThemeMode:  ThemeSystem,
			Accent:     AccentGreen,
			Density:    DensityComfortable,
			ButtonSize: ButtonSizeMD,
			FontScale:  1,
		},
		Notifications: Notifications{
			Enabled:      true,
			ShowPreview:  true,
			DoNotDisturb: false,
		},
		Window: Window{
			CloseBehavior:  CloseBehaviorQuit,
			AlwaysOnTop:    false,
			RememberBounds: true,
		},
	}
}
