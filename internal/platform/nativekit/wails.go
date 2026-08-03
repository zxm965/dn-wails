package nativekit

import (
	"errors"

	"dn-wails/internal/nativekit"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var ErrClipboardUnavailable = errors.New("clipboard is unavailable")

type Wails struct {
	app    *application.App
	window *application.WebviewWindow
}

func NewWails(app *application.App, window *application.WebviewWindow) *Wails {
	return &Wails{app: app, window: window}
}

func (w *Wails) OpenExternalURL(rawURL string) error {
	return w.app.Browser.OpenURL(rawURL)
}

func (w *Wails) OpenPath(path string) error {
	return w.app.Browser.OpenFile(path)
}

func (w *Wails) ReadClipboard() (string, error) {
	text, ok := w.app.Clipboard.Text()
	if !ok {
		return "", ErrClipboardUnavailable
	}
	return text, nil
}

func (w *Wails) WriteClipboard(text string) error {
	if !w.app.Clipboard.SetText(text) {
		return ErrClipboardUnavailable
	}
	return nil
}

func (w *Wails) OpenFiles(options nativekit.OpenFilesOptions) ([]string, error) {
	dialog := w.app.Dialog.OpenFile().
		AttachToWindow(w.window).
		SetTitle(options.Title).
		SetDirectory(options.DefaultDirectory).
		CanChooseFiles(true).
		CanChooseDirectories(false)
	for _, filter := range options.Filters {
		dialog.AddFilter(filter.DisplayName, filter.Pattern)
	}

	if options.Multiple {
		return dialog.PromptForMultipleSelection()
	}

	path, err := dialog.PromptForSingleSelection()
	if err != nil || path == "" {
		return nil, err
	}
	return []string{path}, nil
}

func (w *Wails) OpenDirectory(title string, defaultDirectory string) (string, error) {
	return w.app.Dialog.OpenFile().
		AttachToWindow(w.window).
		SetTitle(title).
		SetDirectory(defaultDirectory).
		CanChooseFiles(false).
		CanChooseDirectories(true).
		PromptForSingleSelection()
}

func (w *Wails) SaveFile(options nativekit.SaveFileOptions) (string, error) {
	dialog := w.app.Dialog.SaveFile()
	dialog.SetOptions(&application.SaveFileDialogOptions{
		Title:     options.Title,
		Directory: options.DefaultDirectory,
		Filename:  options.DefaultFilename,
		Window:    w.window,
	})
	for _, filter := range options.Filters {
		dialog.AddFilter(filter.DisplayName, filter.Pattern)
	}
	return dialog.PromptForSingleSelection()
}

func (w *Wails) ShowMessageDialog(options nativekit.MessageDialogOptions) (string, error) {
	dialog := messageDialog(w.app, options.Type).
		AttachToWindow(w.window).
		SetTitle(options.Title).
		SetMessage(options.Message)

	buttons := options.Buttons
	if len(buttons) == 0 {
		buttons = []string{"OK"}
	}
	selected := ""
	for _, label := range buttons {
		button := dialog.AddButton(label)
		button.OnClick(func() {
			selected = label
		})
		if label == options.DefaultButton {
			dialog.SetDefaultButton(button)
		}
		if label == options.CancelButton {
			dialog.SetCancelButton(button)
		}
	}
	dialog.Show()
	return selected, nil
}

func (w *Wails) Screens() ([]nativekit.Screen, error) {
	currentScreen, err := w.window.GetScreen()
	if err != nil {
		return nil, err
	}

	allScreens := w.app.Screen.GetAll()
	screens := make([]nativekit.Screen, 0, len(allScreens))
	for _, screen := range allScreens {
		screens = append(screens, nativekit.Screen{
			IsCurrent:      currentScreen != nil && screen.ID == currentScreen.ID,
			IsPrimary:      screen.IsPrimary,
			Width:          screen.Size.Width,
			Height:         screen.Size.Height,
			PhysicalWidth:  screen.PhysicalBounds.Width,
			PhysicalHeight: screen.PhysicalBounds.Height,
		})
	}
	return screens, nil
}

func messageDialog(app *application.App, dialogType string) *application.MessageDialog {
	switch dialogType {
	case "warning":
		return app.Dialog.Warning()
	case "error":
		return app.Dialog.Error()
	case "question":
		return app.Dialog.Question()
	default:
		return app.Dialog.Info()
	}
}
