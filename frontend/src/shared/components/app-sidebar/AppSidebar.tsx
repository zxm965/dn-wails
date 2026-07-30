import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

import { appConfig } from '@/app/appConfig'
import appIcon from '@/assets/images/app-icon.png'

import './AppSidebar.css'

export type AppView = 'overview' | 'settings' | 'test-tools'

interface NavigationItem {
  id: AppView
  label: string
  description: string
  icon: 'home' | 'settings' | 'tools'
}

const NAVIGATION_GROUPS: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: '主菜单',
    items: [{ id: 'overview', label: '应用概览', description: '运行状态与能力概览', icon: 'home' }],
  },
  {
    label: '系统设置',
    items: [
      { id: 'settings', label: '偏好设置', description: '外观、通知与窗口', icon: 'settings' },
      { id: 'test-tools', label: '测试工具', description: '验证桌面与原生能力', icon: 'tools' },
    ],
  },
]

const SIDEBAR_MIN_WIDTH = 64
const SIDEBAR_MAX_WIDTH = 220
const SIDEBAR_DEFAULT_WIDTH = 180
const SIDEBAR_COLLAPSED_THRESHOLD = 104
const SIDEBAR_STORAGE_KEY = 'dn-wails:sidebar-width'

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))
}

function initialSidebarWidth(): number {
  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY))
  return Number.isFinite(storedWidth) && storedWidth > 0 ? clampSidebarWidth(storedWidth) : SIDEBAR_DEFAULT_WIDTH
}

interface AppSidebarProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ pointerX: 0, width: SIDEBAR_DEFAULT_WIDTH })
  const isCollapsed = sidebarWidth < SIDEBAR_COLLAPSED_THRESHOLD
  const sidebarStyle = { '--app-sidebar-width': `${sidebarWidth}px` } as CSSProperties

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    document.body.classList.toggle('is-resizing-sidebar', isResizing)
    return () => document.body.classList.remove('is-resizing-sidebar')
  }, [isResizing])

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    resizeStart.current = { pointerX: event.clientX, width: sidebarWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsResizing(true)
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isResizing) {
      return
    }

    const nextWidth = resizeStart.current.width + event.clientX - resizeStart.current.pointerX
    setSidebarWidth(clampSidebarWidth(nextWidth))
  }

  function handleResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsResizing(false)
  }

  function handleResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    let nextWidth = sidebarWidth
    if (event.key === 'ArrowLeft') {
      nextWidth -= 8
    } else if (event.key === 'ArrowRight') {
      nextWidth += 8
    } else if (event.key === 'Home') {
      nextWidth = SIDEBAR_MIN_WIDTH
    } else if (event.key === 'End') {
      nextWidth = SIDEBAR_MAX_WIDTH
    } else {
      return
    }

    event.preventDefault()
    setSidebarWidth(clampSidebarWidth(nextWidth))
  }

  return (
    <aside className={`app-sidebar${isCollapsed ? ' is-collapsed' : ''}`} style={sidebarStyle}>
      <div className='app-sidebar-product'>
        <img src={appIcon} alt='' />
        <div>
          <strong>{appConfig.displayName}</strong>
          <span>Desktop Application</span>
        </div>
      </div>

      <nav className='app-sidebar-navigation' aria-label='应用菜单'>
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.label} className='app-sidebar-group'>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={activeView === item.id ? 'is-active' : ''}
                type='button'
                title={item.label}
                aria-current={activeView === item.id ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <NavigationIcon name={item.icon} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className='app-sidebar-footer'>
        <span className='app-sidebar-status-dot' aria-hidden='true' />
        <div>
          <small>Wails · React · Go</small>
        </div>
      </div>

      <div
        className={`app-sidebar-resizer${isResizing ? ' is-resizing' : ''}`}
        role='separator'
        aria-label='调整侧边栏宽度'
        aria-orientation='vertical'
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onKeyDown={handleResizeKeyDown}
      />
    </aside>
  )
}

interface NavigationIconProps {
  name: NavigationItem['icon']
}

function NavigationIcon({ name }: NavigationIconProps) {
  if (name === 'settings') {
    return (
      <svg viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z' />
        <path d='M19 13.3a7.8 7.8 0 0 0 0-2.6l2-1.5-2-3.4-2.4 1a8.8 8.8 0 0 0-2.2-1.3L14 3h-4l-.4 2.5a8.8 8.8 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2.6l-2 1.5 2 3.4 2.4-1a8.8 8.8 0 0 0 2.2 1.3L10 21h4l.4-2.5a8.8 8.8 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.5Z' />
      </svg>
    )
  }

  if (name === 'tools') {
    return (
      <svg viewBox='0 0 24 24' aria-hidden='true'>
        <path d='m14.5 6.5 3-3a5 5 0 0 1-6 6L5 16l-2 5 5-2 6.5-6.5a5 5 0 0 1 6-6l-3 3-3-3Z' />
      </svg>
    )
  }

  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path d='m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z' />
    </svg>
  )
}
