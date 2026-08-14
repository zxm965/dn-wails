import { globalStyle, style } from '@vanilla-extract/css'

const devToolsPanel = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '14px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'devtools-panel',
  containerType: 'inline-size',
})

const devToolsBadge = style([
  {
    position: 'relative',
    zIndex: '1',
    minHeight: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 11px',
    color: 'var(--text-secondary)',
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'color-mix(in srgb, var(--surface-muted) 84%, transparent)',
    border: '1px solid var(--border-strong)',
    borderRadius: '999px',
    backdropFilter: 'blur(12px)',
  },
  {
    '@container': {
      'devtools-panel (max-width: 600px)': {
        alignSelf: 'flex-start',
      },
    },
  },
])

const devToolsLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '14px',
})

const devToolsCategories = style({
  position: 'sticky',
  top: '12px',
  zIndex: '20',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '5px',
  padding: '5px',
  background: 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(6, 12, 21, 0.12)',
  backdropFilter: 'blur(18px)',
})

const isActive = style({
  selectors: {
    [`${devToolsCategories} button&`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
    [`${devToolsCategories} button&[data-button-variant='ghost']:hover`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
  },
})

const devToolsCategoryIndex = style({
  flex: '0 0 auto',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.08em',
})

const devToolsCategoryCopy = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
})

const devToolsView = style({
  minWidth: '0',
  containerName: 'devtools-view',
  containerType: 'inline-size',
})

const devToolsResult = style([
  {
    display: 'grid',
    gridTemplateColumns: '36px minmax(0, 1fr)',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
    padding: '11px 13px',
    background:
      'linear-gradient(100deg, color-mix(in srgb, var(--accent-muted) 58%, var(--surface-elevated)), color-mix(in srgb, var(--surface-muted) 58%, transparent))',
    border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border-subtle))',
    borderRadius: '12px',
  },
  {
    '@container': {
      'devtools-view (max-width: 440px)': {
        gridTemplateColumns: '36px minmax(0, 1fr)',
      },
    },
  },
])

const devToolsResultIcon = style({
  width: '36px',
  height: '36px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 82%, var(--surface-elevated))',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
  borderRadius: '10px',
})

const devToolsSection = style({
  position: 'relative',
  minWidth: '0',
  overflow: 'hidden',
  padding: 'var(--panel-padding)',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 96%, var(--accent) 4%), var(--surface-elevated))',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
  selectors: {
    '&::after': {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '72px',
      height: '1px',
      content: '""',
      background: 'linear-gradient(90deg, transparent, var(--accent))',
      pointerEvents: 'none',
    },
  },
})

const devToolsDesktopLab = style({
  isolation: 'isolate',
  padding: 'clamp(18px, 2.4vw, 26px)',
  background:
    'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent-muted) 72%, transparent), transparent 32%), linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 97%, var(--accent) 3%), var(--surface-elevated))',
  selectors: {
    '&::before': {
      position: 'absolute',
      right: '-90px',
      bottom: '-110px',
      zIndex: '-1',
      width: '260px',
      height: '260px',
      content: '""',
      background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-muted) 52%, transparent), transparent 68%)',
      pointerEvents: 'none',
    },
  },
})

const devToolsLabHeader = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
  },
  {
    '@container': {
      'devtools-view (max-width: 560px)': {
        flexDirection: 'column',
      },
    },
  },
])

const devToolsLabMeta = style({
  flex: '0 0 auto',
  minHeight: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 10px',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.04em',
  background: 'color-mix(in srgb, var(--accent-muted) 74%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--border-subtle))',
  borderRadius: '999px',
})

const devToolsCapabilityContent = style({
  display: 'grid',
  gap: '14px',
})

const devToolsCapabilityGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    alignItems: 'stretch',
  },
  {
    '@container': {
      'devtools-view (max-width: 760px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const devToolsCapabilityGroup = style({
  minWidth: '0',
  padding: '16px',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-muted) 68%, transparent), color-mix(in srgb, var(--surface-elevated) 78%, transparent))',
  border: '1px solid color-mix(in srgb, var(--border-subtle) 82%, var(--accent) 18%)',
  borderRadius: '14px',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
  ':hover': {
    borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-strong))',
    boxShadow: '0 12px 28px rgba(6, 12, 21, 0.08)',
    transform: 'translateY(-1px)',
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

const devToolsCapabilityHeading = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '38px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '11px',
})

const devToolsCapabilityIcon = style({
  width: '38px',
  height: '38px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 82%, var(--surface-elevated))',
  border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
  borderRadius: '11px',
})

const devToolsCapabilityCount = style({
  minWidth: '30px',
  padding: '4px 7px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'center',
  background: 'color-mix(in srgb, var(--surface-elevated) 72%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
})

const devToolsActions = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'devtools-view (max-width: 440px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const devToolsActionIcon = style({
  width: '27px',
  height: '27px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 72%, transparent)',
  borderRadius: '8px',
})

const devToolsDropAction = style({
  minWidth: '0',
  minHeight: '42px',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  padding: '5px 10px',
  color: 'var(--text-primary)',
  background:
    'linear-gradient(115deg, color-mix(in srgb, var(--accent-muted) 56%, transparent), color-mix(in srgb, var(--surface-elevated) 72%, transparent))',
  border: '1px dashed color-mix(in srgb, var(--accent) 38%, var(--border-strong))',
  borderRadius: '10px',
  vars: {
    '--wails-drop-target': 'drop',
  },
})

const devToolsDropCopy = style({
  minWidth: '0',
})

export const styles = {
  'devtools-panel': devToolsPanel,
  'devtools-badge': devToolsBadge,
  'devtools-layout': devToolsLayout,
  'devtools-categories': devToolsCategories,
  'is-active': isActive,
  'devtools-category-index': devToolsCategoryIndex,
  'devtools-category-copy': devToolsCategoryCopy,
  'devtools-view': devToolsView,
  'devtools-result': devToolsResult,
  'devtools-result-icon': devToolsResultIcon,
  'devtools-section': devToolsSection,
  'devtools-desktop-lab': devToolsDesktopLab,
  'devtools-lab-header': devToolsLabHeader,
  'devtools-lab-meta': devToolsLabMeta,
  'devtools-capability-content': devToolsCapabilityContent,
  'devtools-capability-grid': devToolsCapabilityGrid,
  'devtools-capability-group': devToolsCapabilityGroup,
  'devtools-capability-heading': devToolsCapabilityHeading,
  'devtools-capability-icon': devToolsCapabilityIcon,
  'devtools-capability-count': devToolsCapabilityCount,
  'devtools-actions': devToolsActions,
  'devtools-action-icon': devToolsActionIcon,
  'devtools-drop-action': devToolsDropAction,
  'devtools-drop-copy': devToolsDropCopy,
} as const

globalStyle(`${devToolsBadge} > span`, {
  width: '6px',
  height: '6px',
  background: 'var(--accent)',
  borderRadius: '50%',
  boxShadow: '0 0 0 4px var(--accent-muted)',
})

globalStyle(`${devToolsCategories} button`, {
  minWidth: '0',
  justifyContent: 'flex-start',
  gap: '10px',
  padding: '0 12px',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  background: 'transparent',
  borderColor: 'transparent',
  borderRadius: '8px',
})

globalStyle(`${devToolsCategories} button[data-button-variant='ghost']:hover`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-hover)',
})

globalStyle(`${devToolsCategoryCopy} strong`, {
  overflow: 'hidden',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${devToolsCategoryCopy} small`, {
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${devToolsResultIcon} svg`, {
  width: '17px',
  height: '17px',
})

globalStyle(`${devToolsResult} > div > span`, {
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${devToolsResult} p`, {
  minWidth: '0',
  margin: '3px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.55',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
})

globalStyle(`${devToolsSection} > header`, {
  marginBottom: '16px',
  paddingBottom: '14px',
  borderBottom: '1px solid var(--border-subtle)',
})

globalStyle(`${devToolsLabHeader} > div > span`, {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${devToolsSection} h2`, {
  margin: '0',
  fontSize: '15px',
})

globalStyle(`${devToolsSection} header p`, {
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

globalStyle(`${devToolsCapabilityIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${devToolsCapabilityHeading} > div`, {
  minWidth: '0',
})

globalStyle(`${devToolsCapabilityHeading} small`, {
  display: 'block',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${devToolsCapabilityHeading} strong`, {
  display: 'block',
  marginTop: '3px',
  fontSize: '13px',
})

globalStyle(`${devToolsCapabilityGroup} > p`, {
  minHeight: '32px',
  margin: '10px 0 14px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.55',
})

globalStyle(`${devToolsActions} button`, {
  minHeight: '42px',
  justifyContent: 'flex-start',
  gap: '9px',
  padding: '0 10px',
  color: 'var(--text-primary)',
  fontSize: '10px',
  fontWeight: '700',
  background: 'color-mix(in srgb, var(--surface-elevated) 72%, transparent)',
  borderColor: 'var(--border-subtle)',
  borderRadius: '10px',
})

globalStyle(`${devToolsActionIcon} svg`, {
  width: '14px',
  height: '14px',
})

globalStyle(`${devToolsActions} button:hover`, {
  background: 'var(--surface-hover)',
  borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-strong))',
  boxShadow: '0 8px 18px rgba(6, 12, 21, 0.1)',
  transform: 'translateY(-1px)',
})

globalStyle(`${devToolsDropCopy} strong`, {
  display: 'block',
  overflow: 'hidden',
  fontSize: '10px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${devToolsDropCopy} small`, {
  display: 'block',
  overflow: 'hidden',
  marginTop: '2px',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${devToolsCategoryCopy} small`, {
  '@container': {
    'devtools-panel (max-width: 520px)': {
      display: 'none',
    },
  },
})
