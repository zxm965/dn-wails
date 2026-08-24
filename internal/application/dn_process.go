package application

import (
	"log"
	"strings"

	"cull-pear/internal/dnprocess"
)

func (a *App) ListDragonNestProcesses() ([]dnprocess.Info, error) {
	return a.dnProcessService.List()
}

func (a *App) TerminateDragonNestProcess(target dnprocess.Target) (dnprocess.Info, error) {
	info, err := a.dnProcessService.Terminate(target)
	if err != nil {
		return dnprocess.Info{}, err
	}
	a.rememberDragonNestTarget(info.Path)
	return info, nil
}

func (a *App) KillDragonNestProcess() (dnprocess.Info, error) {
	settingsSnapshot := a.settingsService.Get()
	info, err := a.dnProcessService.TerminateConfigured(settingsSnapshot.DragonNest.TargetPath)
	if err != nil {
		return dnprocess.Info{}, err
	}
	a.rememberDragonNestTarget(info.Path)
	return info, nil
}

func (a *App) rememberDragonNestTarget(path string) {
	path = strings.TrimSpace(path)
	if path == "" {
		return
	}
	current := a.settingsService.Get()
	if strings.EqualFold(current.DragonNest.TargetPath, path) {
		return
	}
	current.DragonNest.TargetPath = path
	if _, err := a.settingsService.Update(current); err != nil {
		// The process has already been terminated; target persistence is only a convenience for the shortcut.
		// Keep the operation successful and leave the diagnostic detail in the application log.
		log.Printf("remember Dragon Nest target path: %v", err)
		return
	}
}
