import { GetSettings, ResetSettings, UpdateSettings } from '@wails/go/application/App'
import { settings as WailsSettings } from '@wails/go/models'

export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange'
export type Density = 'comfortable' | 'compact'
export type CloseBehavior = 'quit' | 'hide'

export interface AppearanceSettings {
  themeMode: ThemeMode
  accent: AccentColor
  density: Density
  fontScale: number
}

export interface NotificationSettings {
  enabled: boolean
  showPreview: boolean
  doNotDisturb: boolean
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
  maximised: boolean
}

export interface WindowSettings {
  closeBehavior: CloseBehavior
  alwaysOnTop: boolean
  rememberBounds: boolean
  bounds?: WindowBounds
}

export interface AppSettings {
  version: number
  appearance: AppearanceSettings
  notifications: NotificationSettings
  window: WindowSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  appearance: {
    themeMode: 'system',
    accent: 'green',
    density: 'comfortable',
    fontScale: 1,
  },
  notifications: {
    enabled: true,
    showPreview: true,
    doNotDisturb: false,
  },
  window: {
    closeBehavior: 'quit',
    alwaysOnTop: false,
    rememberBounds: true,
  },
}

function normalizeSettings(value: WailsSettings.AppSettings): AppSettings {
  return {
    version: value.version,
    appearance: {
      themeMode: value.appearance.themeMode as ThemeMode,
      accent: value.appearance.accent as AccentColor,
      density: value.appearance.density as Density,
      fontScale: value.appearance.fontScale,
    },
    notifications: {
      enabled: value.notifications.enabled,
      showPreview: value.notifications.showPreview,
      doNotDisturb: value.notifications.doNotDisturb,
    },
    window: {
      closeBehavior: value.window.closeBehavior as CloseBehavior,
      alwaysOnTop: value.window.alwaysOnTop,
      rememberBounds: value.window.rememberBounds,
      bounds: value.window.bounds
        ? {
            x: value.window.bounds.x,
            y: value.window.bounds.y,
            width: value.window.bounds.width,
            height: value.window.bounds.height,
            maximised: value.window.bounds.maximised,
          }
        : undefined,
    },
  }
}

function toWailsSettings(value: AppSettings): WailsSettings.AppSettings {
  return WailsSettings.AppSettings.createFrom(value)
}

export async function loadSettings(): Promise<AppSettings> {
  return normalizeSettings(await GetSettings())
}

export async function saveSettings(value: AppSettings): Promise<AppSettings> {
  return normalizeSettings(await UpdateSettings(toWailsSettings(value)))
}

export async function restoreDefaultSettings(): Promise<AppSettings> {
  return normalizeSettings(await ResetSettings())
}
