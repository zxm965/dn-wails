import React from 'react'
import { createRoot } from 'react-dom/client'
import '@wailsio/runtime'

import App from '@/app/App'
import { AppUpdateProvider } from '@/features/app-update'
import { DnAuthProvider } from '@/features/dn-system'
import { SettingsProvider } from '@/features/settings'
import { FeedbackProvider } from '@/shared/feedback'
import { OverlayProvider } from '@/shared/overlay'
import { ThemeProvider } from '@/shared/theme'

import '@/app/styles/global.css'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <OverlayProvider>
          <FeedbackProvider>
            <AppUpdateProvider>
              <DnAuthProvider>
                <App />
              </DnAuthProvider>
            </AppUpdateProvider>
          </FeedbackProvider>
        </OverlayProvider>
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
