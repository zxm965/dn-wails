import { useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { AccountTitleBarButton, useAccount } from '@/features/account'
import { useSettings } from '@/features/settings'
import { SiteMessageCenter, SiteMessageProvider } from '@/features/site-messages'
import { TaskReminderMonitor } from '@/features/tasks'
import { AppSidebar } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { ScrollArea } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import {
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
        <TaskReminderMonitor
          enabled={Boolean(account.user)}
          onOpenTasks={() => navigate(`${getAppViewPath('tasks')}?tab=tasks`)}
        />
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
            <Outlet />
          </ScrollArea>
        </div>
      </div>
    </SiteMessageProvider>
  )
}
