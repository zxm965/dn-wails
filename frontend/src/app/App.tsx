import { useEffect, useRef, useState } from 'react'

import { AccountLogin, AccountPanel, AccountTitleBarButton, useAccount } from '@/features/account'
import { DevToolsPanel } from '@/features/devtools'
import { DnDashboard, DnRoles, DnWeeklyPlans } from '@/features/dn-system'
import { QuickNotesPanel } from '@/features/quick-notes'
import { DEFAULT_SETTINGS, SettingsPanel, useSettings } from '@/features/settings'
import {
  SiteMessageCenter,
  SiteMessageProvider,
  SiteMessages,
  type SiteMessageNavigationTarget,
} from '@/features/site-messages'
import { AppSidebar, type AppView } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { ListState } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { appViewRequiresAuth, getAppViewTitle, getFirstVisibleView, isAppViewVisible } from '@/shared/navigation'
import { windowManager } from '@/shared/window'

import { appConfig } from './appConfig'

import { styles } from './App.css'

const cx = createScopedClassNames(styles)

export default function App() {
  const { settings, isLoading: isSettingsLoading } = useSettings()
  const [activeView, setActiveView] = useState<AppView>(() =>
    getFirstVisibleView(DEFAULT_SETTINGS.navigation.menuVisibility),
  )
  const navigationInitialized = useRef(false)
  const account = useAccount()
  const isDnView = activeView.startsWith('dn-') || activeView === 'site-messages'
  const viewTitle = getAppViewTitle(activeView)
  const windowTitle = `${appConfig.displayName} · ${viewTitle}`

  function navigateDn(target: SiteMessageNavigationTarget) {
    setActiveView(
      {
        dashboard: 'dn-dashboard',
        weekly: 'dn-weekly',
        roles: 'dn-roles',
        messages: 'site-messages',
        account: 'account',
      }[target] as AppView,
    )
  }

  function renderDnView() {
    if (activeView === 'dn-dashboard') {
      return <DnDashboard onNavigateWeekly={() => setActiveView('dn-weekly')} />
    }
    if (activeView === 'dn-weekly') return <DnWeeklyPlans onNavigateRoles={() => setActiveView('dn-roles')} />
    if (activeView === 'dn-roles') return <DnRoles />
    if (activeView === 'site-messages') return <SiteMessages onNavigate={navigateDn} />
    return null
  }

  function renderActiveView() {
    if (appViewRequiresAuth(activeView)) {
      if (account.loading) {
        return <ListState loading emptyText='登录状态加载失败' loadingText='正在恢复登录状态…' />
      }
      if (!account.user) {
        return <AccountLogin />
      }
    }

    if (isDnView) return renderDnView()
    if (activeView === 'quick-notes') return <QuickNotesPanel />
    if (activeView === 'account') return <AccountPanel />
    if (activeView === 'settings') return <SettingsPanel />
    if (activeView === 'devtools') return <DevToolsPanel />
    return null
  }

  useEffect(() => {
    document.title = windowTitle
    windowManager.setTitle(windowTitle)
  }, [windowTitle])

  useEffect(() => {
    if (isSettingsLoading) {
      return
    }

    if (!navigationInitialized.current) {
      navigationInitialized.current = true
      setActiveView(getFirstVisibleView(settings.navigation.menuVisibility))
      return
    }

    if (!isAppViewVisible(activeView, settings.navigation.menuVisibility)) {
      setActiveView(getFirstVisibleView(settings.navigation.menuVisibility))
    }
  }, [activeView, isSettingsLoading, settings.navigation.menuVisibility])

  return (
    <SiteMessageProvider onNavigate={navigateDn}>
      <div className={cx('app-shell')}>
        <TitleBar
          title={windowTitle}
          actions={
            <>
              {account.user && <SiteMessageCenter />}
              <AccountTitleBarButton user={account.user} onClick={() => setActiveView('account')} />
            </>
          }
        />
        <div className={cx('app-workspace')}>
          <AppSidebar
            activeView={activeView}
            menuVisibility={settings.navigation.menuVisibility}
            onNavigate={setActiveView}
          />
          <main className={cx('app-content')}>{renderActiveView()}</main>
        </div>
      </div>
    </SiteMessageProvider>
  )
}
