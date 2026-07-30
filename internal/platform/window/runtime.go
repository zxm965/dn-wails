package window

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Runtime struct{}

func NewRuntime() *Runtime {
	return &Runtime{}
}

func (r *Runtime) Show(ctx context.Context)       { runtime.Show(ctx) }
func (r *Runtime) Hide(ctx context.Context)       { runtime.WindowHide(ctx) }
func (r *Runtime) Quit(ctx context.Context)       { runtime.Quit(ctx) }
func (r *Runtime) Unminimise(ctx context.Context) { runtime.WindowUnminimise(ctx) }
func (r *Runtime) Maximise(ctx context.Context)   { runtime.WindowMaximise(ctx) }
func (r *Runtime) SetAlwaysOnTop(ctx context.Context, enabled bool) {
	runtime.WindowSetAlwaysOnTop(ctx, enabled)
}
func (r *Runtime) SetPosition(ctx context.Context, x int, y int) {
	runtime.WindowSetPosition(ctx, x, y)
}
func (r *Runtime) GetPosition(ctx context.Context) (int, int) { return runtime.WindowGetPosition(ctx) }
func (r *Runtime) SetSize(ctx context.Context, width int, height int) {
	runtime.WindowSetSize(ctx, width, height)
}
func (r *Runtime) GetSize(ctx context.Context) (int, int) { return runtime.WindowGetSize(ctx) }
func (r *Runtime) IsMaximised(ctx context.Context) bool   { return runtime.WindowIsMaximised(ctx) }
