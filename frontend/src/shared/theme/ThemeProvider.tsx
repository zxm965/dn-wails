import { WindowSetDarkTheme, WindowSetLightTheme, WindowSetSystemDefaultTheme } from '@wails/runtime/runtime'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { useSettings } from '@/features/settings'

export type EffectiveTheme = 'light' | 'dark'

interface ThemeProviderProps {
  children: ReactNode
}

function systemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useSettings()
  const [systemMode, setSystemMode] = useState<EffectiveTheme>(systemTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemMode(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const effectiveTheme = useMemo<EffectiveTheme>(
    () => (settings.appearance.themeMode === 'system' ? systemMode : settings.appearance.themeMode),
    [settings.appearance.themeMode, systemMode],
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = effectiveTheme
    root.dataset.accent = settings.appearance.accent
    root.dataset.density = settings.appearance.density
    root.dataset.buttonSize = settings.appearance.buttonSize
    root.style.setProperty('--font-scale', String(settings.appearance.fontScale))

    if (settings.appearance.themeMode === 'system') {
      WindowSetSystemDefaultTheme()
    } else if (effectiveTheme === 'dark') {
      WindowSetDarkTheme()
    } else {
      WindowSetLightTheme()
    }
  }, [effectiveTheme, settings.appearance])

  return children
}
