package nativekit

import (
	"context"

	"dn-wails/internal/nativekit"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Wails struct{}

func NewWails() *Wails {
	return &Wails{}
}

func (w *Wails) OpenExternalURL(ctx context.Context, rawURL string) {
	runtime.BrowserOpenURL(ctx, rawURL)
}

func (w *Wails) ReadClipboard(ctx context.Context) (string, error) {
	return runtime.ClipboardGetText(ctx)
}

func (w *Wails) WriteClipboard(ctx context.Context, text string) error {
	return runtime.ClipboardSetText(ctx, text)
}

func (w *Wails) OpenFiles(ctx context.Context, options nativekit.OpenFilesOptions) ([]string, error) {
	dialogOptions := runtime.OpenDialogOptions{
		Title:            options.Title,
		DefaultDirectory: options.DefaultDirectory,
		Filters:          toRuntimeFilters(options.Filters),
	}
	if options.Multiple {
		return runtime.OpenMultipleFilesDialog(ctx, dialogOptions)
	}

	path, err := runtime.OpenFileDialog(ctx, dialogOptions)
	if err != nil || path == "" {
		return nil, err
	}
	return []string{path}, nil
}

func (w *Wails) OpenDirectory(ctx context.Context, title string, defaultDirectory string) (string, error) {
	return runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
		Title:            title,
		DefaultDirectory: defaultDirectory,
	})
}

func (w *Wails) SaveFile(ctx context.Context, options nativekit.SaveFileOptions) (string, error) {
	return runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		Title:            options.Title,
		DefaultDirectory: options.DefaultDirectory,
		DefaultFilename:  options.DefaultFilename,
		Filters:          toRuntimeFilters(options.Filters),
	})
}

func (w *Wails) ShowMessageDialog(ctx context.Context, options nativekit.MessageDialogOptions) (string, error) {
	return runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
		Type:          runtime.DialogType(options.Type),
		Title:         options.Title,
		Message:       options.Message,
		Buttons:       options.Buttons,
		DefaultButton: options.DefaultButton,
		CancelButton:  options.CancelButton,
	})
}

func (w *Wails) Screens(ctx context.Context) ([]nativekit.Screen, error) {
	runtimeScreens, err := runtime.ScreenGetAll(ctx)
	if err != nil {
		return nil, err
	}

	screens := make([]nativekit.Screen, 0, len(runtimeScreens))
	for _, screen := range runtimeScreens {
		screens = append(screens, nativekit.Screen{
			IsCurrent:      screen.IsCurrent,
			IsPrimary:      screen.IsPrimary,
			Width:          screen.Size.Width,
			Height:         screen.Size.Height,
			PhysicalWidth:  screen.PhysicalSize.Width,
			PhysicalHeight: screen.PhysicalSize.Height,
		})
	}

	return screens, nil
}

func toRuntimeFilters(filters []nativekit.FileFilter) []runtime.FileFilter {
	result := make([]runtime.FileFilter, 0, len(filters))
	for _, filter := range filters {
		result = append(result, runtime.FileFilter{
			DisplayName: filter.DisplayName,
			Pattern:     filter.Pattern,
		})
	}
	return result
}
