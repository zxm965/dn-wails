import {
  CalendarCheck,
  ChevronDown,
  CircleUserRound,
  Gauge,
  Mails,
  Settings,
  Sparkles,
  UsersRound,
  Wrench,
} from 'lucide-react'
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
import { Button } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './AppSidebar.css'

const cx = createScopedClassNames(styles)

export type AppView =
  | 'dn-dashboard'
  | 'dn-weekly'
  | 'dn-roles'
  | 'dn-messages'
  | 'dn-account'
  | 'settings'
  | 'test-tools'

interface NavigationItem {
  id: AppView
  label: string
  icon: 'dashboard' | 'weekly' | 'roles' | 'messages' | 'account' | 'settings' | 'tools'
}

interface NavigationGroup {
  label: string
  parent?: { label: string }
  items: NavigationItem[]
}

const DN_VIEWS: AppView[] = ['dn-dashboard', 'dn-weekly', 'dn-roles', 'dn-messages', 'dn-account']

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: '业务系统',
    parent: { label: 'DN 周常管理' },
    items: [
      { id: 'dn-dashboard', label: '仪表盘', icon: 'dashboard' },
      { id: 'dn-weekly', label: '周计划', icon: 'weekly' },
      { id: 'dn-roles', label: '角色', icon: 'roles' },
      { id: 'dn-messages', label: '站内消息', icon: 'messages' },
      { id: 'dn-account', label: '个人中心', icon: 'account' },
    ],
  },
  {
    label: '系统设置',
    items: [
      { id: 'settings', label: '偏好设置', icon: 'settings' },
      { id: 'test-tools', label: '测试工具', icon: 'tools' },
    ],
  },
]

const SIDEBAR_MIN_WIDTH = 64
const SIDEBAR_MAX_WIDTH = 220
const SIDEBAR_DEFAULT_WIDTH = 180
const SIDEBAR_COLLAPSED_THRESHOLD = 104
const SIDEBAR_STORAGE_KEY = 'dn-wails:sidebar-width'
const COMPACT_VIEWPORT_QUERY = '(max-width: 820px)'

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))
}

function initialSidebarWidth(): number {
  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY))
  return Number.isFinite(storedWidth) && storedWidth > 0 ? clampSidebarWidth(storedWidth) : SIDEBAR_DEFAULT_WIDTH
}

function initialCompactViewport(): boolean {
  return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches
}

interface AppSidebarProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [isCompactViewport, setIsCompactViewport] = useState(initialCompactViewport)
  const [isResizing, setIsResizing] = useState(false)
  const [dnExpanded, setDnExpanded] = useState(() => DN_VIEWS.includes(activeView))
  const resizeStart = useRef({ pointerX: 0, width: SIDEBAR_DEFAULT_WIDTH })
  const effectiveSidebarWidth = isCompactViewport ? SIDEBAR_MIN_WIDTH : sidebarWidth
  const isCollapsed = effectiveSidebarWidth < SIDEBAR_COLLAPSED_THRESHOLD
  const sidebarStyle = { '--app-sidebar-width': `${effectiveSidebarWidth}px` } as CSSProperties

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    const resizingClassName = cx('is-resizing-sidebar')
    document.body.classList.toggle(resizingClassName, isResizing)
    return () => document.body.classList.remove(resizingClassName)
  }, [isResizing])

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactViewport(event.matches)
      if (event.matches) {
        setIsResizing(false)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (DN_VIEWS.includes(activeView)) {
      setDnExpanded(true)
    }
  }, [activeView])

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
    <aside
      className={cx(
        `app-sidebar${isCollapsed ? ' is-collapsed' : ''}${isCompactViewport ? ' is-viewport-compact' : ''}`,
      )}
      style={sidebarStyle}
    >
      <div className={cx('app-sidebar-product')}>
        <img src={appIcon} alt='' />
        <div>
          <strong>{appConfig.displayName}</strong>
          <span>Desktop Application</span>
        </div>
      </div>

      <nav className={cx('app-sidebar-navigation')} aria-label='应用菜单'>
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.label} className={cx('app-sidebar-group')}>
            <p>{group.label}</p>
            {group.parent && (
              <Button
                className={cx(`app-sidebar-parent${DN_VIEWS.includes(activeView) ? ' is-active' : ''}`)}
                size='lg'
                variant='ghost'
                type='button'
                title={group.parent.label}
                aria-expanded={!isCollapsed ? dnExpanded : undefined}
                onClick={() => {
                  if (isCollapsed) {
                    onNavigate('dn-dashboard')
                  } else {
                    setDnExpanded((current) => !current)
                  }
                }}
              >
                <Sparkles aria-hidden='true' />
                <span className={cx('app-sidebar-label')}>
                  <strong>{group.parent.label}</strong>
                </span>
                <ChevronDown
                  className={cx(`app-sidebar-chevron${dnExpanded ? ' is-expanded' : ''}`)}
                  aria-hidden='true'
                />
              </Button>
            )}
            <div className={cx(group.parent ? `app-sidebar-submenu${dnExpanded ? ' is-expanded' : ''}` : undefined)}>
              {group.items.map((item) => (
                <Button
                  key={item.id}
                  className={cx(activeView === item.id ? 'is-active' : '')}
                  size={group.parent ? 'md' : 'lg'}
                  variant='ghost'
                  type='button'
                  title={item.label}
                  aria-current={activeView === item.id ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  <NavigationIcon name={item.icon} />
                  <span className={cx('app-sidebar-label')}>
                    <strong>{item.label}</strong>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cx('app-sidebar-footer')} title={appConfig.authorName}>
        <span className={cx('app-sidebar-status-dot')} aria-hidden='true' />
        <div>
          <small>{appConfig.authorName}</small>
        </div>
      </div>

      {!isCompactViewport && (
        <div
          className={cx(`app-sidebar-resizer${isResizing ? ' is-resizing' : ''}`)}
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
      )}
    </aside>
  )
}

interface NavigationIconProps {
  name: NavigationItem['icon']
}

function NavigationIcon({ name }: NavigationIconProps) {
  const Icon = {
    dashboard: Gauge,
    weekly: CalendarCheck,
    roles: UsersRound,
    messages: Mails,
    account: CircleUserRound,
    settings: Settings,
    tools: Wrench,
  }[name]
  return <Icon aria-hidden='true' />
}
