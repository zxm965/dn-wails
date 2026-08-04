import { globalStyle, style } from '@vanilla-extract/css'

const testToolsPanel = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '14px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'test-tools-panel',
  containerType: 'inline-size',
})

const testToolsBadge = style([
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
      'test-tools-panel (max-width: 600px)': {
        alignSelf: 'flex-start',
      },
    },
  },
])

const testToolsLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '14px',
})

const testToolsCategories = style({
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
    [`${testToolsCategories} button&`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
    [`${testToolsCategories} button&[data-button-variant='ghost']:hover`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
  },
})

const testToolsCategoryIndex = style({
  flex: '0 0 auto',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.08em',
})

const testToolsCategoryCopy = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
})

const testToolsView = style({
  minWidth: '0',
  containerName: 'test-tools-view',
  containerType: 'inline-size',
})

const testToolsResult = style([
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
      'test-tools-view (max-width: 440px)': {
        gridTemplateColumns: '1fr',
        gap: '4px',
      },
    },
  },
])

const testToolsSection = style({
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

const testToolsCapabilityContent = style({
  display: 'grid',
  gap: '14px',
})

const testToolsCapabilityGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.82fr) minmax(0, 1.18fr)',
    gap: '14px',
    alignItems: 'stretch',
  },
  {
    '@container': {
      'test-tools-view (max-width: 840px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const testToolsActions = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'test-tools-view (max-width: 440px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const testToolsButton = style({
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

const testToolsNote = style({
  marginTop: '14px',
  padding: '11px 13px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.55',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  borderLeft: '2px solid color-mix(in srgb, var(--accent) 54%, transparent)',
  borderRadius: '0 8px 8px 0',
})

const testToolsDropzone = style([
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
      'test-tools-view (max-width: 440px)': {
        padding: '14px 10px',
      },
    },
  },
])

const testToolsOverlayDemo = style({})

export const styles = {
  'test-tools-panel': testToolsPanel,
  'test-tools-badge': testToolsBadge,
  'test-tools-layout': testToolsLayout,
  'test-tools-categories': testToolsCategories,
  'is-active': isActive,
  'test-tools-category-index': testToolsCategoryIndex,
  'test-tools-category-copy': testToolsCategoryCopy,
  'test-tools-view': testToolsView,
  'test-tools-result': testToolsResult,
  'test-tools-section': testToolsSection,
  'test-tools-capability-content': testToolsCapabilityContent,
  'test-tools-capability-grid': testToolsCapabilityGrid,
  'test-tools-actions': testToolsActions,
  'test-tools-button': testToolsButton,
  'is-primary': isPrimary,
  'test-tools-note': testToolsNote,
  'test-tools-dropzone': testToolsDropzone,
  'test-tools-overlay-demo': testToolsOverlayDemo,
} as const

globalStyle(`${testToolsBadge} > span`, {
  width: '6px',
  height: '6px',
  background: 'var(--accent)',
  borderRadius: '50%',
  boxShadow: '0 0 0 4px var(--accent-muted)',
})

globalStyle(`${testToolsCategories} button`, {
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

globalStyle(`${testToolsCategories} button[data-button-variant='ghost']:hover`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-hover)',
})

globalStyle(`${testToolsCategoryCopy} strong`, {
  overflow: 'hidden',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${testToolsCategoryCopy} small`, {
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${testToolsResult} > span`, {
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${testToolsResult} p`, {
  minWidth: '0',
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.55',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
})

globalStyle(`${testToolsSection} > header`, {
  marginBottom: '16px',
  paddingBottom: '14px',
  borderBottom: '1px solid var(--border-subtle)',
})

globalStyle(`${testToolsSection} > header > span`, {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${testToolsSection} h2`, {
  margin: '0',
  fontSize: '15px',
})

globalStyle(`${testToolsSection} header p`, {
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

globalStyle(`${testToolsActions} button`, {
  justifyContent: 'flex-start',
  padding: '0 11px',
  color: 'var(--text-primary)',
  fontSize: '10px',
  fontWeight: '700',
  background: 'color-mix(in srgb, var(--surface-muted) 84%, transparent)',
  borderColor: 'var(--border-subtle)',
  borderRadius: '8px',
})

globalStyle(`${testToolsActions} button::before`, {
  width: '5px',
  height: '5px',
  flex: '0 0 auto',
  content: '""',
  background: 'color-mix(in srgb, var(--accent) 72%, var(--text-tertiary))',
  borderRadius: '50%',
  boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-muted) 70%, transparent)',
})

globalStyle(`${testToolsActions} button:hover`, {
  background: 'var(--surface-hover)',
  borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-strong))',
  boxShadow: '0 8px 18px rgba(6, 12, 21, 0.1)',
  transform: 'translateY(-1px)',
})

globalStyle(`${testToolsDropzone} strong`, {
  fontSize: '10px',
})

globalStyle(`${testToolsDropzone} > span`, {
  marginTop: '4px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

globalStyle(`${testToolsDropzone} ul`, {
  width: '100%',
  maxHeight: '88px',
  overflow: 'auto',
  margin: '10px 0 0',
  padding: '9px 10px 0 26px',
  textAlign: 'left',
  borderTop: '1px solid var(--border-subtle)',
})

globalStyle(`${testToolsDropzone} li`, {
  overflow: 'hidden',
  margin: '4px 0',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${testToolsOverlayDemo} p`, {
  margin: '0 0 22px',
  color: 'var(--text-secondary)',
  lineHeight: '1.65',
})

globalStyle(`${testToolsCategoryCopy} small`, {
  '@container': {
    'test-tools-panel (max-width: 520px)': {
      display: 'none',
    },
  },
})
