package window

import (
	"runtime"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// ProcessWindow owns a single auxiliary window, independent of main-window preferences.
type ProcessWindow struct {
	mu     sync.Mutex
	app    *application.App
	window *application.WebviewWindow
}

func NewProcessWindow(app *application.App) *ProcessWindow {
	return &ProcessWindow{app: app}
}

func (p *ProcessWindow) Open() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.window == nil {
		title := "DN进程关闭"
		if runtime.GOOS == "darwin" {
			title = "Firefox进程关闭"
		}
		p.window = p.app.Window.NewWithOptions(application.WebviewWindowOptions{
			Name: "dn-process", Title: title,
			URL: "/?window=dn-process", Width: 360, Height: 260,
			MinWidth: 280, MinHeight: 220, AlwaysOnTop: true,
			BackgroundColour: application.NewRGB(27, 38, 54),
		})
		p.window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
			event.Cancel()
			p.window.Hide()
		})
	}
	p.window.SetAlwaysOnTop(true)
	p.window.UnMinimise()
	p.window.Show()
	p.window.Focus()
	return nil
}
