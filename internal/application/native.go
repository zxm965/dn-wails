package application

import "cull-pear/internal/nativekit"

func (a *App) OpenExternalURL(rawURL string) error {
	return a.nativeService.OpenExternalURL(rawURL)
}

func (a *App) ReadClipboard() (string, error) {
	return a.nativeService.ReadClipboard()
}

func (a *App) WriteClipboard(text string) error {
	return a.nativeService.WriteClipboard(text)
}

func (a *App) OpenFiles(options nativekit.OpenFilesOptions) ([]string, error) {
	return a.nativeService.OpenFiles(options)
}

func (a *App) OpenDirectory(title string, defaultDirectory string) (string, error) {
	return a.nativeService.OpenDirectory(title, defaultDirectory)
}

func (a *App) SaveFile(options nativekit.SaveFileOptions) (string, error) {
	return a.nativeService.SaveFile(options)
}

func (a *App) ShowMessageDialog(options nativekit.MessageDialogOptions) (string, error) {
	return a.nativeService.ShowMessageDialog(options)
}

func (a *App) GetScreens() ([]nativekit.Screen, error) {
	return a.nativeService.Screens()
}
