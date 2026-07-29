import { GreetingPanel } from '@/features/greeting'
import { TitleBar } from '@/shared/components/titlebar'

import './App.css'

export default function App() {
  return (
    <div className='app-shell'>
      <TitleBar title='dn-wails' />
      <main className='app-content'>
        <GreetingPanel />
      </main>
    </div>
  )
}
