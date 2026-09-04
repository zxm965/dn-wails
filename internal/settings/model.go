package settings

const CurrentVersion = 8

const DefaultDragonNestShortcutKey = "Ctrl+F4"

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

type Navigation struct {
	MenuVisibility map[string]bool `json:"menuVisibility"`
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

type DragonNest struct {
	ShortcutEnabled bool   `json:"shortcutEnabled"`
	ShortcutKey     string `json:"shortcutKey"`
	TargetPath      string `json:"targetPath"`
}

type AppSettings struct {
	Version       int           `json:"version"`
	Appearance    Appearance    `json:"appearance"`
	Notifications Notifications `json:"notifications"`
	Navigation    Navigation    `json:"navigation"`
	Window        Window        `json:"window"`
	DragonNest    DragonNest    `json:"dragonNest"`
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
		Navigation: Navigation{
			MenuVisibility: make(map[string]bool),
		},
		Window: Window{
			CloseBehavior:  CloseBehaviorQuit,
			AlwaysOnTop:    false,
			RememberBounds: true,
		},
		DragonNest: DragonNest{
			ShortcutEnabled: false,
			ShortcutKey:     DefaultDragonNestShortcutKey,
		},
	}
}
