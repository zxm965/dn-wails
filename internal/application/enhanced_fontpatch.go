package application

import (
	"context"
	"cull-pear/internal/fontpatch"
)

type EnhancedFontPatchService interface {
	EnhancedStatus() fontpatch.EnhancedStatus
	ImportFont(context.Context, int, string) (fontpatch.SourceFont, error)
	Compose(context.Context, fontpatch.CompositionRequest) (fontpatch.CompositionPreview, error)
	ConfirmComposition(context.Context, string, fontpatch.CompositionRequest) (fontpatch.Result, error)
	SourcePreview(context.Context, string) (fontpatch.Preview, error)
	Preview(context.Context, string) (fontpatch.Preview, error)
	Export(context.Context, string, string) error
	Cancel()
	Reset() error
	Close() error
}

func (a *App) GetEnhancedFontPatchStatus() fontpatch.EnhancedStatus {
	if a.enhancedFontPatchService == nil {
		return fontpatch.EnhancedStatus{}
	}
	return a.enhancedFontPatchService.EnhancedStatus()
}

func (a *App) ImportCompositionFont(slot int, path string) (fontpatch.SourceFont, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.SourceFont{}, err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.SourceFont{}, fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.ImportFont(ctx, slot, path)
}

func (a *App) PreviewFontComposition(request fontpatch.CompositionRequest) (fontpatch.CompositionPreview, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.CompositionPreview{}, err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.CompositionPreview{}, fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.Compose(ctx, request)
}

func (a *App) BuildFontComposition(id string, request fontpatch.CompositionRequest) (fontpatch.Result, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Result{}, err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.Result{}, fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.ConfirmComposition(ctx, id, request)
}

func (a *App) GetCompositionSourcePreview(id string) (fontpatch.Preview, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Preview{}, err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.Preview{}, fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.SourcePreview(ctx, id)
}

func (a *App) GetCompositionPreview(id string) (fontpatch.Preview, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return fontpatch.Preview{}, err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.Preview{}, fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.Preview(ctx, id)
}

func (a *App) SaveFontComposition(id, destination string) error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}
	if a.enhancedFontPatchService == nil {
		return fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.Export(ctx, id, destination)
}
func (a *App) CancelFontComposition() {
	if a.enhancedFontPatchService != nil {
		a.enhancedFontPatchService.Cancel()
	}
}
func (a *App) ResetFontComposition() error {
	if a.enhancedFontPatchService == nil {
		return fontpatch.ErrUnavailable
	}
	return a.enhancedFontPatchService.Reset()
}
