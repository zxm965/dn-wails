package application

import (
	"context"
	"time"

	"cull-pear/internal/appupdate"
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
	install := a.applicationUpdateService.Install
	if progressService, ok := a.applicationUpdateService.(interface {
		InstallWithProgress(context.Context, string, appupdate.ProgressCallback) error
	}); ok {
		install = func(installContext context.Context, version string) error {
			return progressService.InstallWithProgress(installContext, version, func(progress appupdate.Progress) {
				if a.runtime != nil {
					a.runtime.Event.Emit(ApplicationUpdateProgressEvent, progress)
				}
			})
		}
	}
	if err := install(ctx, expectedVersion); err != nil {
		return err
	}

	a.mu.Lock()
	a.forceQuit = true
	a.mu.Unlock()
	go func() {
		time.Sleep(250 * time.Millisecond)
		a.windowService.Quit()
	}()
	return nil
}
