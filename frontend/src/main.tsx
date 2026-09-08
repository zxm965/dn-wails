import React from 'react'
import { createRoot } from 'react-dom/client'
import '@wailsio/runtime'

import App from '@/app/App'
import { AppProviders } from '@/app/AppProviders'

import '@/app/styles/global.css'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
