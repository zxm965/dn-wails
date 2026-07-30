import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  DEFAULT_SETTINGS,
  loadSettings,
  restoreDefaultSettings,
  saveSettings,
  type AppSettings,
} from '../api/settingsApi'

interface SettingsContextValue {
  settings: AppSettings
  isLoading: boolean
  isSaving: boolean
  error: string
  updateSettings: (next: AppSettings) => Promise<AppSettings>
  resetSettings: () => Promise<AppSettings>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '读取应用设置失败。'
}

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const refreshSettings = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setSettings(await loadSettings())
    } catch (loadError: unknown) {
      setError(errorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSettings()
  }, [refreshSettings])

  const updateSettings = useCallback(async (next: AppSettings) => {
    setIsSaving(true)
    setError('')
    try {
      const updated = await saveSettings(next)
      setSettings(updated)
      return updated
    } catch (saveError: unknown) {
      setError(errorMessage(saveError))
      throw saveError
    } finally {
      setIsSaving(false)
    }
  }, [])

  const resetSettings = useCallback(async () => {
    setIsSaving(true)
    setError('')
    try {
      const defaults = await restoreDefaultSettings()
      setSettings(defaults)
      return defaults
    } catch (resetError: unknown) {
      setError(errorMessage(resetError))
      throw resetError
    } finally {
      setIsSaving(false)
    }
  }, [])

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
