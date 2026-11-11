import { Navigate, type RouteObject, useNavigate } from 'react-router'

import { AccountLogin, AccountPanel, useAccount } from '@/features/account'
import { CalendarPanel } from '@/features/calendar'
import { DevToolsPanel } from '@/features/devtools'
import { DnRoles, DnProcessKiller, DnWeeklyPlans } from '@/features/dn-system'
import { FontPatchPanel } from '@/features/font-patch'
import { SettingsPanel, useSettings } from '@/features/settings'
import { SiteMessages } from '@/features/site-messages'
import { ListState } from '@/shared/components/ui'
import {
  APP_ROUTES,
  APP_VIEWS,
  appViewRequiresAuth,
  getAppViewPath,
  getFirstVisibleView,
  type AppView,
} from '@/shared/navigation'

import App from './App'
import { PageError } from './PageError'
import { TaskNotesPage } from './TaskNotesPage'

function AppPage({ view }: { view: AppView }) {
  const account = useAccount()
  const navigate = useNavigate()
  function navigateToView(nextView: AppView) {
    void navigate(getAppViewPath(nextView))
  }
  if (appViewRequiresAuth(view)) {
    if (account.loading) {
      return <ListState loading emptyText='登录状态加载失败' loadingText='正在恢复登录状态…' />
    }
    if (!account.user) {
      return <AccountLogin />
    }
  }

  if (view === 'calendar') return <CalendarPanel />
  if (view === 'tasks') return <TaskNotesPage key={account.user?.id} />
  if (view === 'account') return <AccountPanel key={account.user?.id} />
  if (view === 'dn-weekly')
    return <DnWeeklyPlans key={account.user?.id} onNavigateRoles={() => navigateToView('dn-roles')} />
  if (view === 'dn-roles') return <DnRoles key={account.user?.id} />
  if (view === 'dn-patches') return <FontPatchPanel />
  if (view === 'dn-kill-process') return <DnProcessKiller />
  if (view === 'site-messages') return <SiteMessages key={account.user?.id} onNavigate={navigateToView} />
  if (view === 'settings') return <SettingsPanel />
  if (view === 'devtools') return <DevToolsPanel />
  return null
}

function DefaultRoute() {
  const { settings } = useSettings()
  const view = getFirstVisibleView(settings.navigation.menuVisibility, settings.navigation.menuOrder)
  return <Navigate replace to={getAppViewPath(view)} />
}

export const appRoutes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { index: true, element: <DefaultRoute /> },
      ...APP_VIEWS.map((view) => ({
        path: APP_ROUTES[view].path,
        element: <AppPage view={view} />,
        errorElement: <PageError />,
      })),
      { path: '*', element: <DefaultRoute /> },
    ],
  },
]
