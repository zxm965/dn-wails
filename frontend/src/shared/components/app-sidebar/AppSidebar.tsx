import { ChevronDown, type LucideIcon } from 'lucide-react'
import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

import { appConfig } from '@/app/appConfig'
import { BrandIcon } from '@/shared/components/brand-icon'
import { Button } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import {
  MENU_GROUPS,
  isMenuEntryVisible,
  type AppView,
  type MenuEntry,
  type MenuKey,
  type MenuVisibility,
} from '@/shared/navigation'

import { styles } from './AppSidebar.css'

const cx = createScopedClassNames(styles)

type ParentMenuEntry = Extract<MenuEntry, { children: readonly unknown[] }>

interface SidebarFlyout {
  entryKey: MenuKey
  top: number
  left: number
}

const SIDEBAR_MIN_WIDTH = 64
const SIDEBAR_MAX_WIDTH = 220
const SIDEBAR_DEFAULT_WIDTH = 180
const SIDEBAR_COLLAPSED_THRESHOLD = 104
const SIDEBAR_STORAGE_KEY = 'cull-pear:sidebar-width'
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

function isEntryActive(entry: MenuEntry, activeView: AppView): boolean {
  return 'children' in entry ? entry.children.some((item) => item.view === activeView) : entry.view === activeView
}

function activeParentKey(activeView: AppView): MenuKey | undefined {
  for (const group of MENU_GROUPS) {
    for (const entry of group.entries) {
      if ('children' in entry && entry.children.some((item) => item.view === activeView)) {
        return entry.key
      }
    }
  }

  return undefined
}

interface AppSidebarProps {
  activeView: AppView
  menuVisibility: MenuVisibility
  onNavigate: (view: AppView) => void
}

export function AppSidebar({ activeView, menuVisibility, onNavigate }: AppSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth)
  const [isCompactViewport, setIsCompactViewport] = useState(initialCompactViewport)
  const [isResizing, setIsResizing] = useState(false)
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>(() => {
    const key = activeParentKey(activeView)
    return key ? { [key]: true } : {}
  })
  const [flyout, setFlyout] = useState<SidebarFlyout | null>(null)
  const resizeStart = useRef({ pointerX: 0, width: SIDEBAR_DEFAULT_WIDTH })
  const flyoutCloseTimer = useRef<number | undefined>(undefined)
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
    const key = activeParentKey(activeView)
    if (key) {
      setExpandedEntries((current) => ({ ...current, [key]: true }))
    }
  }, [activeView])

  useEffect(() => {
    if (!isCollapsed) {
      setFlyout(null)
    }
  }, [isCollapsed])

  useEffect(
    () => () => {
      if (flyoutCloseTimer.current !== undefined) {
        window.clearTimeout(flyoutCloseTimer.current)
      }
    },
    [],
  )

  function cancelFlyoutClose() {
    if (flyoutCloseTimer.current === undefined) return
    window.clearTimeout(flyoutCloseTimer.current)
    flyoutCloseTimer.current = undefined
  }

  function openFlyout(entry: ParentMenuEntry, trigger: HTMLElement) {
    if (!isCollapsed) return

    cancelFlyoutClose()
    const bounds = trigger.getBoundingClientRect()
    const estimatedFlyoutHeight = entry.children.length * 38 + 50
    setFlyout({
      entryKey: entry.key,
      top: Math.max(8, Math.min(bounds.top - 8, window.innerHeight - estimatedFlyoutHeight - 8)),
      left: bounds.right + 8,
    })
  }

  function scheduleFlyoutClose() {
    cancelFlyoutClose()
    flyoutCloseTimer.current = window.setTimeout(() => {
      setFlyout(null)
      flyoutCloseTimer.current = undefined
    }, 160)
  }

  function navigate(view: AppView) {
    cancelFlyoutClose()
    setFlyout(null)
    onNavigate(view)
  }

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
        <BrandIcon className={cx('app-sidebar-logo')} />
        <div>
          <strong>{appConfig.displayName}</strong>
          <span>今天赚了吗</span>
        </div>
      </div>

      <nav className={cx('app-sidebar-navigation')} aria-label='应用菜单'>
        {MENU_GROUPS.map((group) => {
          const visibleEntries = group.entries.filter((entry) => isMenuEntryVisible(entry, menuVisibility))
          if (visibleEntries.length === 0) {
            return null
          }

          return (
            <div key={group.key} className={cx('app-sidebar-group')}>
              {'label' in group && group.label && <p>{group.label}</p>}
              {visibleEntries.map((entry) => {
                if (!('children' in entry)) {
                  return (
                    <Button
                      key={entry.key}
                      className={cx(`app-sidebar-menu-item${activeView === entry.view ? ' is-active' : ''}`)}
                      size='lg'
                      variant='ghost'
                      type='button'
                      title={entry.label}
                      aria-current={activeView === entry.view ? 'page' : undefined}
                      onClick={() => navigate(entry.view)}
                    >
                      <NavigationIcon icon={entry.icon} />
                      <span className={cx('app-sidebar-label')}>
                        <strong>{entry.label}</strong>
                      </span>
                    </Button>
                  )
                }

                const expanded = Boolean(expandedEntries[entry.key])
                const active = isEntryActive(entry, activeView)
                return (
                  <Fragment key={entry.key}>
                    <Button
                      className={cx(`app-sidebar-menu-item app-sidebar-parent${active ? ' is-active' : ''}`)}
                      size='lg'
                      variant='ghost'
                      type='button'
                      title={entry.label}
                      aria-haspopup={isCollapsed ? 'menu' : undefined}
                      aria-controls={isCollapsed ? `${entry.key}-flyout` : `${entry.key}-submenu`}
                      aria-expanded={isCollapsed ? flyout?.entryKey === entry.key : expanded}
                      onMouseEnter={(event) => openFlyout(entry, event.currentTarget)}
                      onMouseLeave={scheduleFlyoutClose}
                      onFocus={(event) => openFlyout(entry, event.currentTarget)}
                      onBlur={isCollapsed ? scheduleFlyoutClose : undefined}
                      onClick={() => {
                        if (isCollapsed) {
                          navigate(entry.defaultView)
                        } else {
                          setExpandedEntries((current) => ({ ...current, [entry.key]: !expanded }))
                        }
                      }}
                    >
                      <NavigationIcon icon={entry.icon} />
                      <span className={cx('app-sidebar-label')}>
                        <strong>{entry.label}</strong>
                      </span>
                      <ChevronDown
                        className={cx(`app-sidebar-chevron${expanded ? ' is-expanded' : ''}`)}
                        aria-hidden='true'
                      />
                    </Button>

                    {isCollapsed && flyout?.entryKey === entry.key && (
                      <div
                        id={`${entry.key}-flyout`}
                        className={cx('app-sidebar-flyout')}
                        role='menu'
                        aria-label={entry.label}
                        style={{ top: flyout.top, left: flyout.left }}
                        onMouseEnter={cancelFlyoutClose}
                        onMouseLeave={scheduleFlyoutClose}
                        onFocus={cancelFlyoutClose}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            scheduleFlyoutClose()
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setFlyout(null)
                          }
                        }}
                      >
                        <strong className={cx('app-sidebar-flyout-title')}>{entry.label}</strong>
                        <div className={cx('app-sidebar-flyout-items')}>
                          {entry.children.map((item) => (
                            <Button
                              key={item.key}
                              className={cx(
                                `app-sidebar-flyout-item${activeView === item.view ? ' is-flyout-active' : ''}`,
                              )}
                              size='md'
                              variant='ghost'
                              type='button'
                              role='menuitem'
                              aria-current={activeView === item.view ? 'page' : undefined}
                              onClick={() => navigate(item.view)}
                            >
                              <NavigationIcon icon={item.icon} />
                              <span className={cx('app-sidebar-flyout-label')}>{item.label}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      id={`${entry.key}-submenu`}
                      className={cx(`app-sidebar-submenu${expanded ? ' is-expanded' : ''}`)}
                    >
                      {entry.children.map((item) => (
                        <Button
                          key={item.key}
                          className={cx(`app-sidebar-menu-item${activeView === item.view ? ' is-active' : ''}`)}
                          size='md'
                          variant='ghost'
                          type='button'
                          title={item.label}
                          aria-current={activeView === item.view ? 'page' : undefined}
                          onClick={() => navigate(item.view)}
                        >
                          <NavigationIcon icon={item.icon} />
                          <span className={cx('app-sidebar-label')}>
                            <strong>{item.label}</strong>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Fragment>
                )
              })}
            </div>
          )
        })}
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

function NavigationIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden='true' />
}
