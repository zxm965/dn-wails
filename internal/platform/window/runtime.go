package window

import "github.com/wailsapp/wails/v3/pkg/application"

type Runtime struct {
	app    *application.App
	window *application.WebviewWindow
}

func NewRuntime(app *application.App, window *application.WebviewWindow) *Runtime {
	return &Runtime{app: app, window: window}
}

func (r *Runtime) Show() {
	r.window.Show()
	r.window.Focus()
}

func (r *Runtime) Hide()       { r.window.Hide() }
func (r *Runtime) Quit()       { r.app.Quit() }
func (r *Runtime) Unminimise() { r.window.UnMinimise() }
func (r *Runtime) Maximise()   { r.window.Maximise() }
func (r *Runtime) SetAlwaysOnTop(enabled bool) {
	r.window.SetAlwaysOnTop(enabled)
}
func (r *Runtime) SetPosition(x int, y int) { r.window.SetPosition(x, y) }
func (r *Runtime) GetPosition() (int, int)  { return r.window.Position() }
func (r *Runtime) SetSize(width int, height int) {
	r.window.SetSize(width, height)
}
func (r *Runtime) GetSize() (int, int) { return r.window.Size() }
func (r *Runtime) IsMaximised() bool   { return r.window.IsMaximised() }
