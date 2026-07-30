import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import {
  DEFAULT_SETTINGS,
  loadSettings,
  restoreDefaultSettings,
  saveSettings,
  type AppSettings,
} from '../api/settingsApi'

type SettingsUpdater = AppSettings | ((current: AppSettings) => AppSettings)

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '读取应用设置失败。'
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    appearance: { ...settings.appearance },
    notifications: { ...settings.notifications },
    window: {
      ...settings.window,
      bounds: settings.window.bounds ? { ...settings.window.bounds } : undefined,
    },
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => cloneSettings(DEFAULT_SETTINGS))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const settingsRef = useRef(settings)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const revisionRef = useRef(0)
  const pendingWritesRef = useRef(0)

  const applyLocalSettings = useCallback((next: AppSettings) => {
    const cloned = cloneSettings(next)
    settingsRef.current = cloned
    setSettings(cloned)
  }, [])

  const refreshSettings = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      applyLocalSettings(await loadSettings())
    } catch (loadError: unknown) {
      setError(errorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [applyLocalSettings])

  useEffect(() => {
    void refreshSettings()
  }, [refreshSettings])

  const schedulePersist = useCallback(
    (next: AppSettings, persist: () => Promise<AppSettings>) => {
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
    },
    [applyLocalSettings],
  )

  const updateSettings = useCallback(
    (updater: SettingsUpdater) => {
      const next = typeof updater === 'function' ? updater(cloneSettings(settingsRef.current)) : cloneSettings(updater)
      return schedulePersist(next, () => saveSettings(next))
    },
    [schedulePersist],
  )

  const resetSettings = useCallback(() => {
    const defaults = cloneSettings(DEFAULT_SETTINGS)
    return schedulePersist(defaults, restoreDefaultSettings)
  }, [schedulePersist])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, isLoading, isSaving, error, updateSettings, resetSettings, refreshSettings }),
    [error, isLoading, isSaving, refreshSettings, resetSettings, settings, updateSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider.')
  }
  return value
}
