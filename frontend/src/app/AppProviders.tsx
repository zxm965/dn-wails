import { type ReactNode } from 'react'
import { HashRouter } from 'react-router'

import { AccountProvider } from '@/features/account'
import { AppUpdateProvider } from '@/features/app-update'
import { SettingsProvider } from '@/features/settings'
import { InteractionProvider } from '@/shared/interaction'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <InteractionProvider>
        <AppUpdateProvider>
          <AccountProvider>
            <HashRouter>{children}</HashRouter>
          </AccountProvider>
        </AppUpdateProvider>
      </InteractionProvider>
    </SettingsProvider>
  )
}
