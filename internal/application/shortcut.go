package application

import "cull-pear/internal/shortcut"

func (a *App) GetDragonNestShortcutStatus() shortcut.Status {
	return a.shortcut.Status()
}

func (a *App) RetryDragonNestShortcut() shortcut.Status {
	a.syncDragonNestShortcut()
	return a.shortcut.Status()
}

func (a *App) syncDragonNestShortcut() {
	a.shortcutSyncMu.Lock()
	defer a.shortcutSyncMu.Unlock()
	a.mu.RLock()
	ready := a.runtimeReady
	a.mu.RUnlock()
	if !ready {
		return
	}
	preferences := a.settingsService.Get().DragonNest
	a.shortcut.Configure(preferences.GlobalShortcutEnabled, preferences.LocalShortcutKey, preferences.GameShortcutMode)
}
