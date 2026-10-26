import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import { AccountLogin, AccountPanel, AccountTitleBarButton, useAccount } from '@/features/account'
import { CalendarPanel } from '@/features/calendar'
import { DevToolsPanel } from '@/features/devtools'
import { DnRoles, DnProcessKiller, DnWeeklyPlans } from '@/features/dn-system'
import { QuickNotesPanel } from '@/features/quick-notes'
import { SettingsPanel, useSettings } from '@/features/settings'
import { SiteMessageCenter, SiteMessageProvider, SiteMessages } from '@/features/site-messages'
import { TaskReminderMonitor, TasksPanel } from '@/features/tasks'
import { AppSidebar } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { ListState, ScrollArea } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import {
  APP_ROUTES,
  APP_VIEWS,
  appViewRequiresAuth,
  getAppViewFromPath,
  getAppViewPath,
  getAppViewTitle,
  getFirstVisibleView,
  isAppViewVisible,
  type AppView,
} from '@/shared/navigation'
import { windowManager } from '@/shared/window'

import { appConfig } from './appConfig'

import { styles } from './App.css'

const cx = createScopedClassNames(styles)

export default function App() {
  const contentRef = useRef<HTMLDivElement>(null)
  const { settings, isLoading: isSettingsLoading } = useSettings()
  const account = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const routeView = getAppViewFromPath(location.pathname)
  const fallbackView = getFirstVisibleView(settings.navigation.menuVisibility, settings.navigation.menuOrder)
  const activeView = routeView ?? fallbackView
  const viewTitle = getAppViewTitle(activeView)
  const windowTitle = `${appConfig.displayName} · ${viewTitle}`

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = contentRef.current?.animate([{ opacity: 0.65 }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-out',
    })
    return () => animation?.cancel()
  }, [activeView])

  function navigateToView(view: AppView, replace = false) {
    navigate(getAppViewPath(view), { replace })
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

    if (view === 'quick-notes') return <QuickNotesPanel key={account.user?.id} />
    if (view === 'calendar') return <CalendarPanel />
    if (view === 'tasks') return <TasksPanel key={account.user?.id} />
    if (view === 'account') return <AccountPanel key={account.user?.id} />
    if (view === 'dn-weekly')
      return <DnWeeklyPlans key={account.user?.id} onNavigateRoles={() => navigateToView('dn-roles')} />
    if (view === 'dn-roles') return <DnRoles key={account.user?.id} />
    if (view === 'dn-kill-process') return <DnProcessKiller />
    if (view === 'site-messages') return <SiteMessages key={account.user?.id} onNavigate={navigateToView} />
    if (view === 'settings') return <SettingsPanel />
    if (view === 'devtools') return <DevToolsPanel />
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
    navigateToView(getFirstVisibleView(settings.navigation.menuVisibility, settings.navigation.menuOrder), true)
  }, [isSettingsLoading, routeView, settings.navigation.menuVisibility, settings.navigation.menuOrder])

  return (
    <SiteMessageProvider onNavigate={navigateToView}>
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
            menuOrder={settings.navigation.menuOrder}
            onNavigate={navigateToView}
          />
          <ScrollArea
            render={<main />}
            className={cx('app-content')}
            viewportClassName={styles.contentViewport}
            viewportRef={contentRef}
          >
            <Routes>
              <Route path='/' element={<Navigate replace to={getAppViewPath(fallbackView)} />} />
              {APP_VIEWS.map((view) => (
                <Route key={view} path={APP_ROUTES[view].path} element={renderView(view)} />
              ))}
              <Route path='*' element={<Navigate replace to={getAppViewPath(fallbackView)} />} />
            </Routes>
          </ScrollArea>
        </div>
      </div>
    </SiteMessageProvider>
  )
}
