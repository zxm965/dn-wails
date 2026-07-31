import { CircleCheck, Info, OctagonX, TriangleAlert } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { SpinnerIcon } from './Spinner'

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function themeSnapshot(): 'light' | 'dark' {
  const configured = document.documentElement.dataset.theme
  if (configured === 'light' || configured === 'dark') return configured
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function Toaster(props: ToasterProps) {
  const theme = useSyncExternalStore<'light' | 'dark'>(subscribeTheme, themeSnapshot, () => 'light')
  return (
    <Sonner
      position='top-center'
      theme={theme}
      icons={{
        success: <CircleCheck aria-hidden='true' />,
        info: <Info aria-hidden='true' />,
        warning: <TriangleAlert aria-hidden='true' />,
        error: <OctagonX aria-hidden='true' />,
        loading: <SpinnerIcon aria-hidden='true' />,
      }}
      toastOptions={{
        style: {
          color: 'var(--text-primary)',
          background: 'var(--surface-elevated)',
          borderColor: 'var(--border-strong)',
        },
      }}
      {...props}
    />
  )
}
