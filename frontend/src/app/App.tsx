import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import { AccountLogin, AccountPanel, AccountTitleBarButton, useAccount } from '@/features/account'
import { CalendarPanel } from '@/features/calendar'
import { DevToolsPanel } from '@/features/devtools'
import { DnRoles, DnProcessKiller, DnWeeklyPlans } from '@/features/dn-system'
import { QuickNotesPanel } from '@/features/quick-notes'
import { SettingsPanel, useSettings } from '@/features/settings'
import {
  SiteMessageCenter,
  SiteMessageProvider,
  SiteMessages,
  type SiteMessageNavigationTarget,
} from '@/features/site-messages'
import { TaskReminderMonitor, TasksPanel } from '@/features/tasks'
import { AppSidebar } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { ListState } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import {
  APP_ROUTES,
  APP_VIEWS,
  DEVTOOLS_DESKTOP_LAB_PREFERENCE,
  appViewRequiresAuth,
  getAppViewFromPath,
  getAppViewPath,
  getAppViewTitle,
  getFirstVisibleView,
  isAppViewVisible,
  resolveMenuVisibility,
  type AppView,
} from '@/shared/navigation'
import { windowManager } from '@/shared/window'

import { appConfig } from './appConfig'

import { styles } from './App.css'

const cx = createScopedClassNames(styles)

const dnNavigationViews: Record<SiteMessageNavigationTarget, AppView> = {
  weekly: 'dn-weekly',
  roles: 'dn-roles',
  messages: 'site-messages',
  account: 'account',
}

export default function App() {
  const { settings, isLoading: isSettingsLoading } = useSettings()
  const account = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const routeView = getAppViewFromPath(location.pathname)
  const fallbackView = getFirstVisibleView(settings.navigation.menuVisibility)
  const activeView = routeView ?? fallbackView
  const viewTitle = getAppViewTitle(activeView)
  const windowTitle = `${appConfig.displayName} · ${viewTitle}`
  const showDevToolsDesktopLab =
    isAppViewVisible('devtools', settings.navigation.menuVisibility) &&
    resolveMenuVisibility(
      DEVTOOLS_DESKTOP_LAB_PREFERENCE.key,
      DEVTOOLS_DESKTOP_LAB_PREFERENCE.defaultVisible,
      settings.navigation.menuVisibility,
    )

  function navigateToView(view: AppView, replace = false) {
    navigate(getAppViewPath(view), { replace })
  }

  function navigateDn(target: SiteMessageNavigationTarget) {
    navigateToView(dnNavigationViews[target])
  }

  function renderView(view: AppView): ReactNode {
    if (appViewRequiresAuth(view)) {
      if (account.loading) {
        return <ListState loading emptyText='登录状态加载失败' loadingText='正在恢复登录状态…' />
      }
      if (!account.user) {
        return <AccountLogin />
      }
    }

    if (view === 'quick-notes') return <QuickNotesPanel />
    if (view === 'calendar') return <CalendarPanel />
    if (view === 'tasks') return <TasksPanel />
    if (view === 'account') return <AccountPanel />
    if (view === 'dn-weekly') return <DnWeeklyPlans onNavigateRoles={() => navigateToView('dn-roles')} />
    if (view === 'dn-roles') return <DnRoles />
    if (view === 'dn-kill-process') return <DnProcessKiller />
    if (view === 'site-messages') return <SiteMessages onNavigate={navigateDn} />
    if (view === 'settings') return <SettingsPanel />
    if (view === 'devtools') return <DevToolsPanel showDesktopLab={showDevToolsDesktopLab} />
    return null
  }

  useEffect(() => {
    document.title = windowTitle
    windowManager.setTitle(windowTitle)
  }, [windowTitle])

  useEffect(() => {
    if (isSettingsLoading || !routeView || isAppViewVisible(routeView, settings.navigation.menuVisibility)) {
      return
    }
    navigateToView(getFirstVisibleView(settings.navigation.menuVisibility), true)
  }, [isSettingsLoading, routeView, settings.navigation.menuVisibility])

  return (
    <SiteMessageProvider onNavigate={navigateDn}>
      <div className={cx('app-shell')}>
        <TaskReminderMonitor enabled={Boolean(account.user)} onOpenTasks={() => navigateToView('tasks')} />
        <TitleBar
          title={windowTitle}
          actions={
            <>
              {account.user && <SiteMessageCenter />}
              <AccountTitleBarButton user={account.user} onClick={() => navigateToView('account')} />
            </>
          }
        />
        <div className={cx('app-workspace')}>
          <AppSidebar
            activeView={activeView}
            menuVisibility={settings.navigation.menuVisibility}
            onNavigate={navigateToView}
          />
          <main className={cx('app-content')}>
            <Routes>
              <Route path='/' element={<Navigate replace to={getAppViewPath(fallbackView)} />} />
              {APP_VIEWS.map((view) => (
                <Route key={view} path={APP_ROUTES[view].path} element={renderView(view)} />
              ))}
              <Route path='*' element={<Navigate replace to={getAppViewPath(fallbackView)} />} />
            </Routes>
          </main>
        </div>
      </div>
    </SiteMessageProvider>
  )
}
