import appIcon from '@/assets/images/app-icon.png'
import { isMacOS } from '@/shared/lib/platform'
import { windowManager } from '@/shared/window'

import './TitleBar.css'

interface TitleBarProps {
  title: string
}

export function TitleBar({ title }: TitleBarProps) {
  const usesNativeWindowControls = isMacOS()

  return (
    <header
      className={`titlebar${usesNativeWindowControls ? ' titlebar-macos' : ''}`}
      onDoubleClick={windowManager.toggleMaximise}
    >
      <div className='titlebar-brand'>
        <img className='titlebar-logo' src={appIcon} alt='' />
        <span className='titlebar-title'>{title}</span>
      </div>

      {!usesNativeWindowControls && (
        <div className='window-controls' onDoubleClick={(event) => event.stopPropagation()}>
          <button
            className='window-control'
            type='button'
            aria-label='最小化'
            title='最小化'
            onClick={windowManager.minimise}
          >
            <svg viewBox='0 0 12 12' aria-hidden='true'>
              <path d='M2 6.5h8' />
            </svg>
          </button>
          <button
            className='window-control'
            type='button'
            aria-label='最大化或还原'
            title='最大化或还原'
            onClick={windowManager.toggleMaximise}
          >
            <svg viewBox='0 0 12 12' aria-hidden='true'>
              <rect x='2.5' y='2.5' width='7' height='7' rx='0.5' />
            </svg>
          </button>
          <button
            className='window-control window-control-close'
            type='button'
            aria-label='关闭'
            title='关闭'
            onClick={windowManager.close}
          >
            <svg viewBox='0 0 12 12' aria-hidden='true'>
              <path d='m2.5 2.5 7 7m0-7-7 7' />
            </svg>
          </button>
        </div>
      )}
    </header>
  )
}
