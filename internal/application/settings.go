package application

import "dn-wails/internal/settings"

func (a *App) GetSettings() settings.AppSettings {
	return a.settingsService.Get()
}

func (a *App) UpdateSettings(next settings.AppSettings) (settings.AppSettings, error) {
	updated, err := a.settingsService.Update(next)
	if err != nil {
		return settings.AppSettings{}, err
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	return updated, nil
}

func (a *App) ResetSettings() (settings.AppSettings, error) {
	updated, err := a.settingsService.Reset()
	if err != nil {
		return settings.AppSettings{}, err
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	return updated, nil
}
