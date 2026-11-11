import { type ReactNode } from 'react'

import { AccountProvider } from '@/features/account'
import { AppUpdateProvider } from '@/features/app-update'
import { SettingsProvider } from '@/features/settings'
import { InteractionProvider } from '@/shared/interaction'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <InteractionProvider>
        <AppUpdateProvider>
          <AccountProvider>{children}</AccountProvider>
        </AppUpdateProvider>
      </InteractionProvider>
    </SettingsProvider>
  )
}
