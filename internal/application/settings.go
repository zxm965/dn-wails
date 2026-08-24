package application

import (
	"fmt"

	"cull-pear/internal/settings"
)

func (a *App) GetSettings() settings.AppSettings {
	return a.settingsService.Get()
}

func (a *App) UpdateSettings(next settings.AppSettings) (settings.AppSettings, error) {
	previous := a.settingsService.Get()
	updated, err := a.settingsService.Update(next)
	if err != nil {
		return settings.AppSettings{}, err
	}
	if err := a.syncDragonNestShortcut(updated.DragonNest); err != nil {
		if _, rollbackErr := a.settingsService.Update(previous); rollbackErr != nil {
			return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut: %w; rollback settings: %v", err, rollbackErr)
		}
		if restoreErr := a.syncDragonNestShortcut(previous.DragonNest); restoreErr != nil {
			return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut: %w; restore shortcut: %v", err, restoreErr)
		}
		return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut: %w", err)
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	return updated, nil
}

func (a *App) ResetSettings() (settings.AppSettings, error) {
	previous := a.settingsService.Get()
	updated, err := a.settingsService.Reset()
	if err != nil {
		return settings.AppSettings{}, err
	}
	if err := a.syncDragonNestShortcut(updated.DragonNest); err != nil {
		if _, rollbackErr := a.settingsService.Update(previous); rollbackErr != nil {
			return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut after reset: %w; rollback settings: %v", err, rollbackErr)
		}
		if restoreErr := a.syncDragonNestShortcut(previous.DragonNest); restoreErr != nil {
			return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut after reset: %w; restore shortcut: %v", err, restoreErr)
		}
		return settings.AppSettings{}, fmt.Errorf("configure Dragon Nest shortcut after reset: %w", err)
	}
	a.windowService.ApplyPreferences(windowPreferences(updated.Window))
	return updated, nil
}
