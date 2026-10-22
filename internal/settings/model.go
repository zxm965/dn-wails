package settings

const CurrentVersion = 11

const DefaultLocalShortcutKey = "F4"

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

	FontSizeSM = "sm"
	FontSizeMD = "md"
	FontSizeLG = "lg"

	CloseBehaviorQuit = "quit"
	CloseBehaviorHide = "hide"
)

type Appearance struct {
	ThemeMode      string `json:"themeMode"`
	Accent         string `json:"accent"`
	Density        string `json:"density"`
	ButtonSize     string `json:"buttonSize"`
	FontSizePreset string `json:"fontSizePreset"`
}

type Notifications struct {
	Enabled      bool `json:"enabled"`
	ShowPreview  bool `json:"showPreview"`
	DoNotDisturb bool `json:"doNotDisturb"`
}

type Navigation struct {
	MenuVisibility map[string]bool     `json:"menuVisibility"`
	MenuOrder      map[string][]string `json:"menuOrder,omitempty"`
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
	GlobalShortcutEnabled bool   `json:"globalShortcutEnabled,omitempty"`
	GameShortcutMode      bool   `json:"gameShortcutMode,omitempty"`
	LocalShortcutKey      string `json:"localShortcutKey"`
	TargetPath            string `json:"targetPath"`
	LauncherPath          string `json:"launcherPath,omitempty"`
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
		Version:    CurrentVersion,
		DragonNest: DragonNest{LocalShortcutKey: DefaultLocalShortcutKey},
		Appearance: Appearance{
			ThemeMode:      ThemeSystem,
			Accent:         AccentGreen,
			Density:        DensityComfortable,
			ButtonSize:     ButtonSizeMD,
			FontSizePreset: FontSizeMD,
		},
		Notifications: Notifications{
			Enabled:      true,
			ShowPreview:  true,
			DoNotDisturb: false,
		},
		Navigation: Navigation{
			MenuVisibility: make(map[string]bool),
			MenuOrder:      make(map[string][]string),
		},
		Window: Window{
			CloseBehavior:  CloseBehaviorQuit,
			AlwaysOnTop:    false,
			RememberBounds: true,
		},
	}
}
