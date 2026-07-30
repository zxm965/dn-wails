package application

import "dn-wails/internal/nativekit"

func (a *App) OpenExternalURL(rawURL string) error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}
	return a.nativeService.OpenExternalURL(ctx, rawURL)
}

func (a *App) ReadClipboard() (string, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return "", err
	}
	return a.nativeService.ReadClipboard(ctx)
}

func (a *App) WriteClipboard(text string) error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}
	return a.nativeService.WriteClipboard(ctx, text)
}

func (a *App) OpenFiles(options nativekit.OpenFilesOptions) ([]string, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return nil, err
	}
	return a.nativeService.OpenFiles(ctx, options)
}

func (a *App) OpenDirectory(title string, defaultDirectory string) (string, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return "", err
	}
	return a.nativeService.OpenDirectory(ctx, title, defaultDirectory)
}

func (a *App) SaveFile(options nativekit.SaveFileOptions) (string, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return "", err
	}
	return a.nativeService.SaveFile(ctx, options)
}

func (a *App) ShowMessageDialog(options nativekit.MessageDialogOptions) (string, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return "", err
	}
	return a.nativeService.ShowMessageDialog(ctx, options)
}

func (a *App) GetScreens() ([]nativekit.Screen, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return nil, err
	}
	return a.nativeService.Screens(ctx)
}
