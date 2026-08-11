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
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
    padding: '10px 14px',
    background:
      'linear-gradient(90deg, color-mix(in srgb, var(--accent-muted) 72%, var(--surface-elevated)), var(--surface-elevated) 42%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '11px',
  },
  {
    '@container': {
      'devtools-view (max-width: 440px)': {
        gridTemplateColumns: '1fr',
        gap: '4px',
      },
    },
  },
])

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

const devToolsCapabilityContent = style({
  display: 'grid',
  gap: '14px',
})

const devToolsCapabilityGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.82fr) minmax(0, 1.18fr)',
    gap: '14px',
    alignItems: 'stretch',
  },
  {
    '@container': {
      'devtools-view (max-width: 840px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const devToolsActions = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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

const devToolsButton = style({
  padding: '0 12px',
  color: 'var(--text-primary)',
  fontSize: '11px',
  fontWeight: '700',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  cursor: 'pointer',
  ':hover': {
    background: 'var(--surface-hover)',
  },
})

const isPrimary = style({
  color: 'var(--button-primary-text)',
  background: 'var(--accent)',
  borderColor: 'transparent',
})

const devToolsNote = style({
  marginTop: '14px',
  padding: '11px 13px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.55',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  borderLeft: '2px solid color-mix(in srgb, var(--accent) 54%, transparent)',
  borderRadius: '0 8px 8px 0',
})

const devToolsDropzone = style([
  {
    minHeight: '82px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '14px',
    padding: '15px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--accent-muted) 36%, var(--surface-muted)), var(--surface-muted))',
    border: '1px dashed color-mix(in srgb, var(--accent) 34%, var(--border-strong))',
    borderRadius: '10px',
    vars: {
      '--wails-drop-target': 'drop',
    },
  },
  {
    '@container': {
      'devtools-view (max-width: 440px)': {
        padding: '14px 10px',
      },
    },
  },
])

const devToolsOverlayDemo = style({})

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
  'devtools-section': devToolsSection,
  'devtools-capability-content': devToolsCapabilityContent,
  'devtools-capability-grid': devToolsCapabilityGrid,
  'devtools-actions': devToolsActions,
  'devtools-button': devToolsButton,
  'is-primary': isPrimary,
  'devtools-note': devToolsNote,
  'devtools-dropzone': devToolsDropzone,
  'devtools-overlay-demo': devToolsOverlayDemo,
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

globalStyle(`${devToolsResult} > span`, {
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${devToolsResult} p`, {
  minWidth: '0',
  margin: '0',
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

globalStyle(`${devToolsSection} > header > span`, {
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

globalStyle(`${devToolsActions} button`, {
  justifyContent: 'flex-start',
  padding: '0 11px',
  color: 'var(--text-primary)',
  fontSize: '10px',
  fontWeight: '700',
  background: 'color-mix(in srgb, var(--surface-muted) 84%, transparent)',
  borderColor: 'var(--border-subtle)',
  borderRadius: '8px',
})

globalStyle(`${devToolsActions} button::before`, {
  width: '5px',
  height: '5px',
  flex: '0 0 auto',
  content: '""',
  background: 'color-mix(in srgb, var(--accent) 72%, var(--text-tertiary))',
  borderRadius: '50%',
  boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-muted) 70%, transparent)',
})

globalStyle(`${devToolsActions} button:hover`, {
  background: 'var(--surface-hover)',
  borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-strong))',
  boxShadow: '0 8px 18px rgba(6, 12, 21, 0.1)',
  transform: 'translateY(-1px)',
})

globalStyle(`${devToolsDropzone} strong`, {
  fontSize: '10px',
})

globalStyle(`${devToolsDropzone} > span`, {
  marginTop: '4px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

globalStyle(`${devToolsDropzone} ul`, {
  width: '100%',
  maxHeight: '88px',
  overflow: 'auto',
  margin: '10px 0 0',
  padding: '9px 10px 0 26px',
  textAlign: 'left',
  borderTop: '1px solid var(--border-subtle)',
})

globalStyle(`${devToolsDropzone} li`, {
  overflow: 'hidden',
  margin: '4px 0',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${devToolsOverlayDemo} p`, {
  margin: '0 0 22px',
  color: 'var(--text-secondary)',
  lineHeight: '1.65',
})

globalStyle(`${devToolsCategoryCopy} small`, {
  '@container': {
    'devtools-panel (max-width: 520px)': {
      display: 'none',
    },
  },
})
