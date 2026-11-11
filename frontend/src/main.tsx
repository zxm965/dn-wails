import React from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import '@wailsio/runtime'

import { AppProviders } from '@/app/AppProviders'
import { appRoutes } from '@/app/AppRoutes'
import { DnProcessWindow } from '@/features/dn-system'
import { SettingsProvider } from '@/features/settings'

import '@/app/styles/global.css'

const container = document.getElementById('root')

const root = createRoot(container!)
const isProcessWindow = new URLSearchParams(window.location.search).get('window') === 'dn-process'
const router = isProcessWindow ? null : createHashRouter(appRoutes)

root.render(
  <React.StrictMode>
    {router === null ? (
      <SettingsProvider>
        <DnProcessWindow />
      </SettingsProvider>
    ) : (
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    )}
  </React.StrictMode>,
)
