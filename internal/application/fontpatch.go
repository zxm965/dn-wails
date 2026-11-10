package application

import (
	"context"
	"cull-pear/internal/fontpatch"
)

type FontPatchService interface {
	Status() fontpatch.Status
	Build(context.Context, string) (fontpatch.Result, error)
	Export(context.Context, string, string) error
	Preview(context.Context, string) (fontpatch.Preview, error)
	Prepare(context.Context, string, fontpatch.Options) (fontpatch.Draft, error)
	Adjust(context.Context, string, fontpatch.Options) (fontpatch.Draft, error)
	Confirm(context.Context, string) (fontpatch.Result, error)
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

func (a *App) BuildFontPatch(draftID string) (fontpatch.Result, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Result{}, err
	}
	if a.fontPatchService == nil {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Confirm(ctx, draftID)
}

func (a *App) PrepareFontPatch(source string, options fontpatch.Options) (fontpatch.Draft, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Draft{}, err
	}
	if a.fontPatchService == nil {
		return fontpatch.Draft{}, fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Prepare(ctx, source, options)
}

func (a *App) AdjustFontPatch(id string, options fontpatch.Options) (fontpatch.Draft, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Draft{}, err
	}
	if a.fontPatchService == nil {
		return fontpatch.Draft{}, fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Adjust(ctx, id, options)
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

func (a *App) GetFontPatchPreview(id string) (fontpatch.Preview, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Preview{}, err
	}
	if a.fontPatchService == nil {
		return fontpatch.Preview{}, fontpatch.ErrUnavailable
	}
	return a.fontPatchService.Preview(ctx, id)
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
