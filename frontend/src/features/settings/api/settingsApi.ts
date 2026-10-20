import { GetSettings, ResetSettings, UpdateSettings } from '@bindings/cull-pear/internal/application/app'
import { AppSettings as WailsAppSettings } from '@bindings/cull-pear/internal/settings/models'
import { Events } from '@wailsio/runtime'

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

export const LOCAL_SHORTCUT_KEYS = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'Ctrl+Shift+F4',
] as const
export type LocalShortcutKey = (typeof LOCAL_SHORTCUT_KEYS)[number]

export interface DragonNestSettings {
  globalShortcutEnabled: boolean
  gameShortcutMode: boolean
  localShortcutKey: LocalShortcutKey
  targetPath: string
  launcherPath: string
}

export interface AppSettings {
  version: number
  appearance: AppearanceSettings
  notifications: NotificationSettings
  navigation: NavigationSettings
  window: WindowSettings
  dragonNest: DragonNestSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 11,
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
  dragonNest: {
    localShortcutKey: 'F4',
    globalShortcutEnabled: false,
    gameShortcutMode: false,
    targetPath: '',
    launcherPath: '',
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
    dragonNest: {
      localShortcutKey: value.dragonNest.localShortcutKey as LocalShortcutKey,
      globalShortcutEnabled: value.dragonNest.globalShortcutEnabled ?? false,
      gameShortcutMode: value.dragonNest.gameShortcutMode ?? false,
      targetPath: value.dragonNest.targetPath,
      launcherPath: value.dragonNest.launcherPath ?? '',
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

export function onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
  return Events.On('settings:changed', (event) => {
    callback(normalizeSettings(WailsAppSettings.createFrom(event.data)))
  })
}
