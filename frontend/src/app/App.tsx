import { useEffect, useState } from 'react'

import {
  DnAccount,
  DnDashboard,
  DnLogin,
  DnMessageCenter,
  DnMessageProvider,
  DnMessages,
  DnRoles,
  DnWeeklyPlans,
  useDnAuth,
  type DnInternalTarget,
} from '@/features/dn-system'
import { DesktopOverview } from '@/features/foundation'
import { SettingsPanel } from '@/features/settings'
import { TestToolsPanel } from '@/features/test-tools'
import { AppSidebar, type AppView } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { ListState } from '@/shared/components/ui'
import { windowManager } from '@/shared/window'

import './App.css'
import { appConfig } from './appConfig'

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview')
  const auth = useDnAuth()
  const isDnView = activeView.startsWith('dn-')

  const viewTitle = {
    overview: '应用概览',
    'dn-dashboard': 'DN · 仪表盘',
    'dn-weekly': 'DN · 周计划',
    'dn-roles': 'DN · 角色',
    'dn-messages': 'DN · 站内消息',
    'dn-account': 'DN · 个人中心',
    settings: '偏好设置',
    'test-tools': '测试工具',
  }[activeView]
  const windowTitle = `${appConfig.displayName} · ${viewTitle}`

  function navigateDn(target: DnInternalTarget) {
    setActiveView(
      {
        dashboard: 'dn-dashboard',
        weekly: 'dn-weekly',
        roles: 'dn-roles',
        messages: 'dn-messages',
        account: 'dn-account',
      }[target] as AppView,
    )
  }

  function renderDnView() {
    if (auth.loading) return <ListState loading emptyText='登录状态加载失败' loadingText='正在恢复 DN 登录状态…' />
    if (!auth.user) return <DnLogin onAuthenticated={() => setActiveView('dn-dashboard')} />
    if (activeView === 'dn-dashboard') {
      return <DnDashboard onNavigateWeekly={() => setActiveView('dn-weekly')} />
    }
    if (activeView === 'dn-weekly') return <DnWeeklyPlans onNavigateRoles={() => setActiveView('dn-roles')} />
    if (activeView === 'dn-roles') return <DnRoles />
    if (activeView === 'dn-messages') return <DnMessages onNavigate={navigateDn} />
    if (activeView === 'dn-account') return <DnAccount />
    return null
  }

  useEffect(() => {
    document.title = windowTitle
    windowManager.setTitle(windowTitle)
  }, [windowTitle])

  return (
    <DnMessageProvider onNavigate={navigateDn}>
      <div className='app-shell'>
        <TitleBar title={windowTitle} actions={auth.user ? <DnMessageCenter /> : undefined} />
        <div className='app-workspace'>
          <AppSidebar activeView={activeView} onNavigate={setActiveView} />
          <main className='app-content'>
            {activeView === 'overview' && <DesktopOverview />}
            {isDnView && renderDnView()}
            {activeView === 'settings' && <SettingsPanel />}
            {activeView === 'test-tools' && <TestToolsPanel />}
          </main>
        </div>
      </div>
    </DnMessageProvider>
  )
}
