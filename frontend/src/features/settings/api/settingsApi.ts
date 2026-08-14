import { GetSettings, ResetSettings, UpdateSettings } from '@bindings/cull-pear/internal/application/app'
import { AppSettings as WailsAppSettings } from '@bindings/cull-pear/internal/settings/models'

export type ThemeMode = 'system' | 'light' | 'dark'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange'
export type Density = 'comfortable' | 'compact'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type CloseBehavior = 'quit' | 'hide'

export interface AppearanceSettings {
  themeMode: ThemeMode
  accent: AccentColor
  density: Density
  buttonSize: ButtonSize
  fontScale: number
}

export interface NotificationSettings {
  enabled: boolean
  showPreview: boolean
  doNotDisturb: boolean
}

export interface NavigationSettings {
  menuVisibility: Record<string, boolean>
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
  navigation: NavigationSettings
  window: WindowSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 6,
  appearance: {
    themeMode: 'system',
    accent: 'green',
    density: 'comfortable',
    buttonSize: 'md',
    fontScale: 1,
  },
  notifications: {
    enabled: true,
    showPreview: true,
    doNotDisturb: false,
  },
  navigation: {
    menuVisibility: {},
  },
  window: {
    closeBehavior: 'quit',
    alwaysOnTop: false,
    rememberBounds: true,
  },
}

function normalizeMenuVisibility(value: Record<string, boolean | undefined>): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  )
}

function normalizeSettings(value: WailsAppSettings): AppSettings {
  return {
    version: value.version,
    appearance: {
      themeMode: value.appearance.themeMode as ThemeMode,
      accent: value.appearance.accent as AccentColor,
      density: value.appearance.density as Density,
      buttonSize: value.appearance.buttonSize as ButtonSize,
      fontScale: value.appearance.fontScale,
    },
    notifications: {
      enabled: value.notifications.enabled,
      showPreview: value.notifications.showPreview,
      doNotDisturb: value.notifications.doNotDisturb,
    },
    navigation: {
      menuVisibility: normalizeMenuVisibility(value.navigation.menuVisibility),
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

function toWailsSettings(value: AppSettings): WailsAppSettings {
  return WailsAppSettings.createFrom(value)
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
