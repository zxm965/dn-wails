package application

import "cull-pear/internal/settings"

func (a *App) GetSettings() settings.AppSettings {
	return a.settingsService.Get()
}

func (a *App) UpdateSettings(next settings.AppSettings) (settings.AppSettings, error) {
	a.dnProcessMu.Lock()
	defer a.dnProcessMu.Unlock()
	// The process service owns the remembered target; other windows may hold stale snapshots.
	next.DragonNest.TargetPath = a.settingsService.Get().DragonNest.TargetPath
	next.DragonNest.LauncherPath = a.settingsService.Get().DragonNest.LauncherPath
	updated, err := a.settingsService.Update(next)
	if err != nil {
		return settings.AppSettings{}, err
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	if a.runtime != nil {
		a.runtime.Event.Emit(SettingsChangedEvent, updated)
	}
	return updated, nil
}

func (a *App) ResetSettings() (settings.AppSettings, error) {
	a.dnProcessMu.Lock()
	defer a.dnProcessMu.Unlock()
	updated, err := a.settingsService.Reset()
	if err != nil {
		return settings.AppSettings{}, err
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	if a.runtime != nil {
		a.runtime.Event.Emit(SettingsChangedEvent, updated)
	}
	return updated, nil
}
