import { globalStyle, style } from '@vanilla-extract/css'

const disableImageDrag = { WebkitUserDrag: 'none' } as const

const isViewportCompact = style({})

const isCollapsed = style({})

const isExpanded = style({})

const isResizing = style({})

const appSidebar = style({
  position: 'relative',
  width: 'var(--app-sidebar-width)',
  minWidth: 'var(--app-sidebar-width)',
  minHeight: '0',
  flex: '0 0 var(--app-sidebar-width)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'visible',
  padding: '16px 12px 14px',
  background: 'var(--navigation-background)',
  borderRight: '1px solid var(--border-subtle)',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  selectors: {
    [`&${isViewportCompact}`]: {
      paddingTop: '12px',
      paddingBottom: '12px',
    },
    [`&${isCollapsed}`]: {
      paddingRight: '8px',
      paddingLeft: '8px',
    },
  },
})

const appSidebarProduct = style({
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  padding: '4px 8px 18px',
  selectors: {
    [`${appSidebar}${isCollapsed} &`]: {
      justifyContent: 'center',
      paddingRight: '0',
      paddingLeft: '0',
    },
  },
})

const appSidebarLogo = style({
  width: '34px',
  height: '34px',
  selectors: {
    [`${appSidebar}${isCollapsed} &`]: {
      width: '32px',
      height: '32px',
    },
  },
})

const appSidebarFooter = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginTop: '14px',
  padding: '12px 9px 2px',
  borderTop: '1px solid var(--border-subtle)',
  selectors: {
    [`${appSidebar}${isCollapsed} &`]: {
      justifyContent: 'center',
      paddingRight: '0',
      paddingLeft: '0',
    },
  },
})

const appSidebarNavigation = style({
  minHeight: '0',
  flex: '1',
  overflowY: 'auto',
})

const appSidebarGroup = style({
  selectors: {
    '& + &': {
      marginTop: '14px',
    },
    [`${appSidebar}${isCollapsed} & + &`]: {
      marginTop: '14px',
      paddingTop: '14px',
      borderTop: '1px solid var(--border-subtle)',
    },
  },
})

const isActive = style({
  selectors: {
    [`${appSidebarGroup} button&`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
    },
  },
})

const appSidebarMenuItem = style({
  selectors: {
    '& + &': {
      marginTop: '4px',
    },
    [`${appSidebar}${isCollapsed} & + &`]: {
      marginTop: '8px',
    },
  },
})

const appSidebarLabel = style({
  minWidth: '0',
  selectors: {
    [`${appSidebar}${isCollapsed} &`]: {
      display: 'none',
    },
  },
})

const appSidebarParent = style({})

const appSidebarChevron = style({
  width: '14px',
  height: '14px',
  marginLeft: 'auto',
  transition: 'transform 150ms ease',
  selectors: {
    [`&${isExpanded}`]: {
      transform: 'rotate(180deg)',
    },
    [`${appSidebar}${isCollapsed} ${appSidebarParent} &`]: {
      display: 'none',
    },
  },
})

const appSidebarSubmenu = style({
  display: 'none',
  margin: '4px 0 0 10px',
  selectors: {
    [`&${isExpanded}`]: {
      display: 'grid',
    },
    [`${appSidebar}${isCollapsed} &`]: {
      display: 'none',
    },
  },
})

const appSidebarFlyout = style({
  position: 'fixed',
  zIndex: '30',
  width: '168px',
  padding: '8px',
  color: 'var(--text-primary)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
  boxShadow: 'var(--surface-shadow)',
})

const appSidebarFlyoutTitle = style({
  display: 'block',
  padding: '4px 8px 8px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  fontWeight: '800',
  letterSpacing: '0.06em',
})

const appSidebarFlyoutItems = style({
  display: 'grid',
  gap: '6px',
})

const appSidebarFlyoutItem = style({
  selectors: {
    [`${appSidebar}${isCollapsed} ${appSidebarGroup} &`]: {
      width: '100%',
      justifyContent: 'flex-start',
      margin: '0',
      padding: '0 10px',
    },
  },
})

const isFlyoutActive = style({
  selectors: {
    [`${appSidebarFlyoutItem}&`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
    },
  },
})

const appSidebarFlyoutLabel = style({
  overflow: 'hidden',
  fontSize: '11px',
  fontWeight: '700',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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
  '::after': {
    position: 'absolute',
    top: '0',
    right: '3px',
    bottom: '0',
    width: '2px',
    background: 'transparent',
    transition: 'background-color 120ms ease',
    content: "''",
  },
  selectors: {
    '&:hover::after, &:focus-visible::after': {
      background: 'var(--accent)',
    },
    [`&${isResizing}::after`]: {
      background: 'var(--accent)',
    },
  },
})

const isResizingSidebar = style({})

export const styles = {
  'app-sidebar': appSidebar,
  'is-viewport-compact': isViewportCompact,
  'app-sidebar-product': appSidebarProduct,
  'app-sidebar-logo': appSidebarLogo,
  'app-sidebar-footer': appSidebarFooter,
  'app-sidebar-navigation': appSidebarNavigation,
  'app-sidebar-group': appSidebarGroup,
  'app-sidebar-menu-item': appSidebarMenuItem,
  'is-active': isActive,
  'app-sidebar-label': appSidebarLabel,
  'app-sidebar-parent': appSidebarParent,
  'app-sidebar-chevron': appSidebarChevron,
  'is-expanded': isExpanded,
  'app-sidebar-submenu': appSidebarSubmenu,
  'app-sidebar-flyout': appSidebarFlyout,
  'app-sidebar-flyout-title': appSidebarFlyoutTitle,
  'app-sidebar-flyout-items': appSidebarFlyoutItems,
  'app-sidebar-flyout-item': appSidebarFlyoutItem,
  'app-sidebar-flyout-label': appSidebarFlyoutLabel,
  'is-flyout-active': isFlyoutActive,
  'app-sidebar-status-dot': appSidebarStatusDot,
  'app-sidebar-resizer': appSidebarResizer,
  'is-resizing': isResizing,
  'is-resizing-sidebar': isResizingSidebar,
  'is-collapsed': isCollapsed,
} as const

globalStyle(`${appSidebar} *`, {
  WebkitUserSelect: 'none',
  userSelect: 'none',
})

globalStyle(
  `${appSidebar} img,
${appSidebar} svg`,
  disableImageDrag as never,
)

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

globalStyle(
  `body${isResizingSidebar},
body${isResizingSidebar} *`,
  {
    cursor: 'col-resize !important',
    userSelect: 'none !important' as never,
  },
)

globalStyle(
  `${appSidebar}${isCollapsed} ${appSidebarProduct} div,
${appSidebar}${isCollapsed} ${appSidebarGroup} > p,
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

globalStyle(`${appSidebar}${isCollapsed} ${appSidebarGroup} button svg`, {
  width: '20px',
  height: '20px',
})

globalStyle(`${appSidebarFlyoutItem} svg`, {
  width: '16px !important',
  height: '16px !important',
})

globalStyle(`${appSidebarFlyoutItem}${isFlyoutActive} svg`, {
  color: 'var(--accent)',
})
