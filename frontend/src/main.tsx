import React from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/App'
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
            <App />
          </FeedbackProvider>
        </OverlayProvider>
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
