package application

import (
	"time"

	"dn-wails/internal/appupdate"
)

func (a *App) GetApplicationUpdateInfo() appupdate.Info {
	return a.applicationUpdateService.Info()
}

func (a *App) CheckForApplicationUpdate() (appupdate.Status, error) {
	ctx, err := a.runtimeContext()
	if err != nil {
		return appupdate.Status{}, err
	}
	return a.applicationUpdateService.Check(ctx)
}

func (a *App) InstallApplicationUpdate(expectedVersion string) error {
	ctx, err := a.runtimeContext()
	if err != nil {
		return err
	}
	if err := a.applicationUpdateService.Install(ctx, expectedVersion); err != nil {
		return err
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	go func() {
		time.Sleep(250 * time.Millisecond)
		a.windowService.Quit(ctx)
	}()
	return nil
}
