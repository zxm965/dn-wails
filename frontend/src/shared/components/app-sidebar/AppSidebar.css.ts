import { globalStyle, style } from '@vanilla-extract/css'

const disableImageDrag = { WebkitUserDrag: 'none' } as const

const appSidebar = style({
  position: 'relative',
  width: 'var(--app-sidebar-width)',
  minWidth: 'var(--app-sidebar-width)',
  minHeight: '0',
  flex: '0 0 var(--app-sidebar-width)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '16px 12px 14px',
  background: 'var(--navigation-background)',
  borderRight: '1px solid var(--border-subtle)',
  WebkitUserSelect: 'none',
  userSelect: 'none',
})

const isViewportCompact = style({})

const appSidebarProduct = style({
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  padding: '4px 8px 18px',
})

const appSidebarFooter = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginTop: '14px',
  padding: '12px 9px 2px',
  borderTop: '1px solid var(--border-subtle)',
})

const appSidebarNavigation = style({
  minHeight: '0',
  flex: '1',
  overflowY: 'auto',
})

const appSidebarGroup = style({})

const isActive = style({})

const appSidebarLabel = style({
  minWidth: '0',
})

const appSidebarParent = style({})

const appSidebarChevron = style({})

const isExpanded = style({})

const appSidebarSubmenu = style({
  display: 'none',
  margin: '4px 0 0 10px',
})

const appSidebarStatusDot = style({
  width: '8px',
  height: '8px',
  flex: '0 0 auto',
  background: '#18b768',
  borderRadius: '50%',
  boxShadow: '0 0 0 4px rgba(24, 183, 104, 0.12)',
})

const appSidebarResizer = style({
  position: 'absolute',
  top: '0',
  right: '-4px',
  bottom: '0',
  zIndex: '4',
  width: '8px',
  cursor: 'col-resize',
  touchAction: 'none',
  outline: 'none',
})

const isResizing = style({})

const isResizingSidebar = style({})

const isCollapsed = style({})

export const classes = {
  'app-sidebar': appSidebar,
  'is-viewport-compact': isViewportCompact,
  'app-sidebar-product': appSidebarProduct,
  'app-sidebar-footer': appSidebarFooter,
  'app-sidebar-navigation': appSidebarNavigation,
  'app-sidebar-group': appSidebarGroup,
  'is-active': isActive,
  'app-sidebar-label': appSidebarLabel,
  'app-sidebar-parent': appSidebarParent,
  'app-sidebar-chevron': appSidebarChevron,
  'is-expanded': isExpanded,
  'app-sidebar-submenu': appSidebarSubmenu,
  'app-sidebar-status-dot': appSidebarStatusDot,
  'app-sidebar-resizer': appSidebarResizer,
  'is-resizing': isResizing,
  'is-resizing-sidebar': isResizingSidebar,
  'is-collapsed': isCollapsed,
} as const

globalStyle(`${appSidebar}${isViewportCompact}`, {
  paddingTop: '12px',
  paddingBottom: '12px',
})

globalStyle(`${appSidebar} *`, {
  WebkitUserSelect: 'none',
  userSelect: 'none',
})

globalStyle(
  `${appSidebar} img,
${appSidebar} svg`,
  disableImageDrag as never,
)

globalStyle(`${appSidebarProduct} img`, {
  width: '34px',
  height: '34px',
  objectFit: 'contain',
})

globalStyle(
  `${appSidebarProduct} div,
${appSidebarFooter} div`,
  {
    minWidth: '0',
  },
)

globalStyle(
  `${appSidebarProduct} strong,
${appSidebarProduct} span,
${appSidebarFooter} strong,
${appSidebarFooter} small`,
  {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
)

globalStyle(`${appSidebarProduct} strong`, {
  fontSize: '14px',
})

globalStyle(`${appSidebarProduct} span`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  letterSpacing: '0.04em',
})

globalStyle(`${appSidebarGroup} + ${appSidebarGroup}`, {
  marginTop: '14px',
})

globalStyle(`${appSidebarGroup} > p`, {
  margin: '0 9px 5px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  fontWeight: '800',
  letterSpacing: '0.1em',
})

globalStyle(`${appSidebarGroup} button`, {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '9px',
  padding: '0 9px',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  background: 'transparent',
  border: '0',
  borderRadius: '9px',
  cursor: 'pointer',
})

globalStyle(`${appSidebarGroup} button:hover`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-hover)',
})

globalStyle(`${appSidebarGroup} button${isActive}`, {
  color: 'var(--text-primary)',
  background: 'var(--accent-muted)',
})

globalStyle(`${appSidebarGroup} button svg`, {
  width: '19px',
  height: '19px',
  flex: '0 0 auto',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '1.65',
})

globalStyle(`${appSidebarGroup} button${isActive} svg`, {
  color: 'var(--accent)',
})

globalStyle(`${appSidebarGroup} button strong`, {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${appSidebarGroup} button strong`, {
  fontSize: '11px',
})

globalStyle(`${appSidebarParent} ${appSidebarChevron}`, {
  width: '14px',
  height: '14px',
  marginLeft: 'auto',
  transition: 'transform 150ms ease',
})

globalStyle(`${appSidebarParent} ${appSidebarChevron}${isExpanded}`, {
  transform: 'rotate(180deg)',
})

globalStyle(`${appSidebarSubmenu}${isExpanded}`, {
  display: 'grid',
  gap: '4px',
})

globalStyle(`${appSidebarSubmenu} button`, {
  gap: '8px',
  paddingLeft: '10px',
})

globalStyle(`${appSidebarSubmenu} button svg`, {
  width: '15px',
  height: '15px',
})

globalStyle(`${appSidebarFooter} strong`, {
  fontSize: '10px',
})

globalStyle(`${appSidebarFooter} small`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

globalStyle(`${appSidebarResizer}::after`, {
  position: 'absolute',
  top: '0',
  right: '3px',
  bottom: '0',
  width: '2px',
  background: 'transparent',
  transition: 'background-color 120ms ease',
  content: "''",
})

globalStyle(
  `${appSidebarResizer}:hover::after,
${appSidebarResizer}:focus-visible::after,
${appSidebarResizer}${isResizing}::after`,
  {
    background: 'var(--accent)',
  },
)

globalStyle(
  `body${isResizingSidebar},
body${isResizingSidebar} *`,
  {
    cursor: 'col-resize !important',
    userSelect: 'none !important' as never,
  },
)

globalStyle(`${appSidebar}${isCollapsed}`, {
  paddingRight: '8px',
  paddingLeft: '8px',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarProduct}`, {
  justifyContent: 'center',
  paddingRight: '0',
  paddingLeft: '0',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarProduct} img`, {
  width: '32px',
  height: '32px',
})

globalStyle(
  `${appSidebar}${isCollapsed} ${appSidebarProduct} div,
${appSidebar}${isCollapsed} ${appSidebarGroup} > p,
${appSidebar}${isCollapsed} ${appSidebarLabel},
${appSidebar}${isCollapsed} ${appSidebarFooter} div`,
  {
    display: 'none',
  },
)

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarGroup} button`, {
  width: 'var(--button-height-lg)',
  justifyContent: 'center',
  margin: '0 auto',
  padding: '0',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarSubmenu}`, {
  display: 'none',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarParent} ${appSidebarChevron}`, {
  display: 'none',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarGroup} button svg`, {
  width: '20px',
  height: '20px',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarGroup} + ${appSidebarGroup}`, {
  marginTop: '14px',
  paddingTop: '14px',
  borderTop: '1px solid var(--border-subtle)',
})

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarFooter}`, {
  justifyContent: 'center',
  paddingRight: '0',
  paddingLeft: '0',
})
