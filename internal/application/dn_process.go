package application

import (
	"log"
	"strings"

	"cull-pear/internal/dnprocess"
)

// DnProcessChange invalidates process snapshots in every open window.
type DnProcessChange struct {
	Action string `json:"action"`
}

type DnLauncherConfiguration struct {
	Path string `json:"path"`
}

func (a *App) SaveDragonNestLauncherPath(input DnLauncherConfiguration) (DnLauncherConfiguration, error) {
	a.dnProcessMu.Lock()
	defer a.dnProcessMu.Unlock()
	path, err := a.dnProcessService.ValidateLauncherPath(input.Path)
	if err != nil {
		return DnLauncherConfiguration{}, err
	}
	current := a.settingsService.Get()
	current.DragonNest.LauncherPath = path
	updated, err := a.settingsService.Update(current)
	if err != nil {
		return DnLauncherConfiguration{}, err
	}
	if a.runtime != nil {
		a.runtime.Event.Emit(SettingsChangedEvent, updated)
	}
	a.emitDnProcessChanged("refresh")
	return DnLauncherConfiguration{Path: path}, nil
}

func (a *App) emitDnProcessChanged(action string) {
	if a.runtime != nil {
		a.runtime.Event.Emit(DnProcessChangedEvent, DnProcessChange{Action: action})
	}
}

func (a *App) ListDragonNestProcesses() ([]dnprocess.Info, error) {
	items, err := a.dnProcessService.List()
	if err != nil {
		return nil, err
	}
	if path := dnprocess.DetectedLauncherPath(items); path != "" {
		a.dnProcessMu.Lock()
		a.rememberDragonNestLauncher(path)
		a.dnProcessMu.Unlock()
	}
	return items, nil
}

func (a *App) TerminateDragonNestProcess(target dnprocess.Target) (dnprocess.Info, error) {
	if !a.dnProcessMu.TryLock() {
		return dnprocess.Info{}, dnprocess.ErrBusy
	}
	defer a.dnProcessMu.Unlock()
	defer a.emitDnProcessChanged("terminate")

	info, err := a.dnProcessService.Terminate(target)
	if err != nil {
		return dnprocess.Info{}, err
	}
	a.rememberDragonNestTarget(info.Path)
	if path := dnprocess.DetectedLauncherPath([]dnprocess.Info{info}); path != "" {
		a.rememberDragonNestLauncher(path)
	}
	return info, nil
}

func (a *App) KillDragonNestProcess() (dnprocess.Info, error) {
	if !a.dnProcessMu.TryLock() {
		return dnprocess.Info{}, dnprocess.ErrBusy
	}
	defer a.dnProcessMu.Unlock()
	defer a.emitDnProcessChanged("terminate")

	settingsSnapshot := a.settingsService.Get()
	info, err := a.dnProcessService.TerminateConfigured(settingsSnapshot.DragonNest.TargetPath)
	if err != nil {
		return dnprocess.Info{}, err
	}
	a.rememberDragonNestTarget(info.Path)
	if path := dnprocess.DetectedLauncherPath([]dnprocess.Info{info}); path != "" {
		a.rememberDragonNestLauncher(path)
	}
	return info, nil
}

func (a *App) LaunchDragonNestProcess() error {
	if !a.dnProcessMu.TryLock() {
		return dnprocess.ErrBusy
	}
	defer a.dnProcessMu.Unlock()
	path := a.settingsService.Get().DragonNest.LauncherPath
	err := a.dnProcessService.LaunchConfigured(path)
	if err != nil {
		a.emitDnProcessChanged("refresh")
		return err
	}
	a.emitDnProcessChanged("launch")
	return nil
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
	if a.runtime != nil {
		a.runtime.Event.Emit(SettingsChangedEvent, current)
	}
}

func (a *App) rememberDragonNestLauncher(path string) {
	current := a.settingsService.Get()
	// Keep a saved path stable; subsequent scans must not overwrite a user's selection.
	if current.DragonNest.LauncherPath != "" {
		return
	}
	current.DragonNest.LauncherPath = path
	updated, err := a.settingsService.Update(current)
	if err != nil {
		log.Printf("remember Dragon Nest launcher path: %v", err)
		return
	}
	if a.runtime != nil {
		a.runtime.Event.Emit(SettingsChangedEvent, updated)
	}
}

func (a *App) OpenDragonNestProcessWindow() error {
	if a.processWindow == nil {
		return dnprocess.ErrUnavailable
	}
	return a.processWindow.Open()
}
