import { useEffect, useState } from 'react'

import { DesktopOverview } from '@/features/foundation'
import { SettingsPanel } from '@/features/settings'
import { TestToolsPanel } from '@/features/test-tools'
import { AppSidebar, type AppView } from '@/shared/components/app-sidebar'
import { TitleBar } from '@/shared/components/titlebar'
import { windowManager } from '@/shared/window'

import './App.css'
import { appConfig } from './appConfig'

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview')

  const viewTitle = {
    overview: '应用概览',
    settings: '偏好设置',
    'test-tools': '测试工具',
  }[activeView]
  const windowTitle = `${appConfig.displayName} · ${viewTitle}`

  useEffect(() => {
    document.title = windowTitle
    windowManager.setTitle(windowTitle)
  }, [windowTitle])

  return (
    <div className='app-shell'>
      <TitleBar title={windowTitle} />
      <div className='app-workspace'>
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />
        <main className='app-content'>
          {activeView === 'overview' && <DesktopOverview />}
          {activeView === 'settings' && <SettingsPanel />}
          {activeView === 'test-tools' && <TestToolsPanel />}
        </main>
      </div>
    </div>
  )
}
