import React from 'react'
import { createRoot } from 'react-dom/client'
import '@wailsio/runtime'

import App from '@/app/App'
import { AppProviders } from '@/app/AppProviders'
import { DnProcessWindow } from '@/features/dn-system'
import { SettingsProvider } from '@/features/settings'

import '@/app/styles/global.css'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).get('window') === 'dn-process' ? (
      <SettingsProvider>
        <DnProcessWindow />
      </SettingsProvider>
    ) : (
      <AppProviders>
        <App />
      </AppProviders>
    )}
  </React.StrictMode>,
)
