package application

import (
	"context"
	"cull-pear/internal/fontpatch"
)

type FontPatchService interface {
	Status() fontpatch.Status
	Build(context.Context, string) (fontpatch.Result, error)
	Export(context.Context, string, string) error
	Cancel()
	Reset() error
	Close() error
}

func (a *App) GetFontPatchStatus() fontpatch.Status {
	if a.fontPatchService == nil {
		return fontpatch.Status{}
	}
	return a.fontPatchService.Status()
}

func (a *App) BuildFontPatch(source string) (fontpatch.Result, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Result{}, err
	}
	if a.fontPatchService == nil {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Build(ctx, source)
}

func (a *App) SaveFontPatch(id, destination string) error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}
	if a.fontPatchService == nil {
		return fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Export(ctx, id, destination)
}

func (a *App) CancelFontPatch() {
	if a.fontPatchService != nil {
		a.fontPatchService.Cancel()
	}
}

func (a *App) ResetFontPatch() error {
	if a.fontPatchService == nil {
		return fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Reset()
}
