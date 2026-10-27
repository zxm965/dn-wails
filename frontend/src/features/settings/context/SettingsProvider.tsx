import { createContext, type ReactNode, useContext, useEffect, useEffectEvent, useRef, useState } from 'react'

import {
  DEFAULT_SETTINGS,
  loadSettings,
  onSettingsChanged,
  restoreDefaultSettings,
  saveSettings,
  type AppSettings,
} from '../api/settingsApi'

type SettingsUpdater = AppSettings | ((current: AppSettings) => AppSettings)
type EffectiveTheme = 'light' | 'dark'

interface SettingsContextValue {
  settings: AppSettings
  isLoading: boolean
  isSaving: boolean
  error: string
  updateSettings: (updater: SettingsUpdater) => Promise<AppSettings>
  resetSettings: () => Promise<AppSettings>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function systemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '读取应用设置失败。'
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    appearance: { ...settings.appearance },
    notifications: { ...settings.notifications },
    navigation: {
      ...settings.navigation,
      menuVisibility: { ...settings.navigation.menuVisibility },
      menuOrder: Object.fromEntries(
        Object.entries(settings.navigation.menuOrder).map(([key, order]) => [key, [...order]]),
      ),
    },
    window: {
      ...settings.window,
      bounds: settings.window.bounds ? { ...settings.window.bounds } : undefined,
    },
    dragonNest: { ...settings.dragonNest },
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => cloneSettings(DEFAULT_SETTINGS))
  const [systemMode, setSystemMode] = useState<EffectiveTheme>(systemTheme)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const settingsRef = useRef(settings)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const revisionRef = useRef(0)
  const pendingWritesRef = useRef(0)

  const applyLocalSettings = (next: AppSettings) => {
    const cloned = cloneSettings(next)
    settingsRef.current = cloned
    setSettings(cloned)
  }

  const refreshSettings = async () => {
    const revision = revisionRef.current
    setIsLoading(true)
    setError('')
    try {
      const loaded = await loadSettings()
      if (revision === revisionRef.current) applyLocalSettings(loaded)
    } catch (loadError: unknown) {
      setError(errorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  const onSettingsReceived = useEffectEvent((next: AppSettings) => {
    if (pendingWritesRef.current > 0) return
    revisionRef.current++
    applyLocalSettings(next)
  })
  useEffect(() => onSettingsChanged((next) => onSettingsReceived(next)), [])

  const onInitialSettings = useEffectEvent(refreshSettings)
  useEffect(() => {
    void onInitialSettings()
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemMode(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const effectiveTheme: EffectiveTheme =
    settings.appearance.themeMode === 'system' ? systemMode : settings.appearance.themeMode

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = effectiveTheme
    root.dataset.accent = settings.appearance.accent
    root.dataset.density = settings.appearance.density
    root.dataset.buttonSize = settings.appearance.buttonSize
    root.dataset.fontSize = settings.appearance.fontSizePreset
  }, [effectiveTheme, settings.appearance])

  const schedulePersist = (next: AppSettings, persist: () => Promise<AppSettings>) => {
    const revision = ++revisionRef.current
    applyLocalSettings(next)
    pendingWritesRef.current++
    setIsSaving(true)
    setError('')

    const operation = queueRef.current
      .catch(() => undefined)
      .then(persist)
      .then((updated) => {
        if (revision === revisionRef.current) {
          applyLocalSettings(updated)
        }
        return updated
      })
      .catch(async (saveError: unknown) => {
        setError(errorMessage(saveError))
        if (revision === revisionRef.current) {
          try {
            applyLocalSettings(await loadSettings())
          } catch {
            // Keep the optimistic value visible while the original persistence error is shown.
          }
        }
        throw saveError
      })
      .finally(() => {
        pendingWritesRef.current--
        if (pendingWritesRef.current === 0) {
          setIsSaving(false)
        }
      })

    queueRef.current = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }

  const updateSettings = (updater: SettingsUpdater) => {
    const next = typeof updater === 'function' ? updater(cloneSettings(settingsRef.current)) : cloneSettings(updater)
    return schedulePersist(next, () => saveSettings(next))
  }

  const resetSettings = () => {
    const defaults = cloneSettings(DEFAULT_SETTINGS)
    return schedulePersist(defaults, restoreDefaultSettings)
  }

  const value: SettingsContextValue = {
    settings,
    isLoading,
    isSaving,
    error,
    updateSettings,
    resetSettings,
    refreshSettings,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider.')
  }
  return value
}
