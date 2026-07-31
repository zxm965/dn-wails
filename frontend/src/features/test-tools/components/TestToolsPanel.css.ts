import { globalStyle, style } from '@vanilla-extract/css'

const testToolsPanel = style({
  width: 'min(1120px, 100%)',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'test-tools-panel',
  containerType: 'inline-size',
})

const testToolsHeading = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '26px',
  },
  {
    '@container': {
      'test-tools-panel (max-width: 700px)': {
        flexDirection: 'column',
      },
    },
  },
])

const testToolsBadge = style([
  {
    padding: '8px 11px',
    color: 'var(--text-tertiary)',
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '999px',
  },
  {
    '@container': {
      'test-tools-panel (max-width: 700px)': {
        alignSelf: 'flex-start',
      },
    },
  },
])

const testToolsLayout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '18px',
})

const testToolsCategories = style({
  position: 'sticky',
  top: '12px',
  zIndex: '20',
  display: 'flex',
  overflowX: 'auto',
  gap: '6px',
  padding: '8px',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '13px',
  boxShadow: 'var(--surface-shadow)',
  scrollbarWidth: 'thin',
})

const isActive = style({})

const testToolsView = style({
  minWidth: '0',
  containerName: 'test-tools-view',
  containerType: 'inline-size',
})

const testToolsResult = style([
  {
    padding: 'var(--panel-padding)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
  },
  {
    marginBottom: '14px',
  },
])

const testToolsSection = style({
  padding: 'var(--panel-padding)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const testToolsActions = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '9px',
  },
  {
    '@container': {
      'test-tools-panel (max-width: 700px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'test-tools-panel (max-width: 480px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const testToolsButton = style({})

const isPrimary = style({})

const testToolsNote = style({
  marginTop: '16px',
  padding: '12px 14px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.55',
  background: 'var(--surface-muted)',
  borderRadius: '8px',
})

const testToolsDropzone = style([
  {
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '18px',
    padding: '18px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    background: 'var(--surface-muted)',
    border: '1px dashed var(--border-strong)',
    borderRadius: '10px',
    vars: {
      '--wails-drop-target': 'drop',
    },
  },
  {
    '@container': {
      'test-tools-panel (max-width: 480px)': {
        padding: '16px 12px',
      },
    },
  },
])

const testToolsOverlayDemo = style({})

export const classes = {
  'test-tools-panel': testToolsPanel,
  'test-tools-heading': testToolsHeading,
  'test-tools-badge': testToolsBadge,
  'test-tools-layout': testToolsLayout,
  'test-tools-categories': testToolsCategories,
  'is-active': isActive,
  'test-tools-view': testToolsView,
  'test-tools-result': testToolsResult,
  'test-tools-section': testToolsSection,
  'test-tools-actions': testToolsActions,
  'test-tools-button': testToolsButton,
  'is-primary': isPrimary,
  'test-tools-note': testToolsNote,
  'test-tools-dropzone': testToolsDropzone,
  'test-tools-overlay-demo': testToolsOverlayDemo,
} as const

globalStyle(`${testToolsHeading} > div:first-child`, {
  minWidth: '0',
})

globalStyle(`${testToolsHeading} p`, {
  margin: '0 0 8px',
  color: 'var(--accent)',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${testToolsHeading} h1`, {
  margin: '0',
  fontSize: 'clamp(28px, 4vw, 38px)',
})

globalStyle(`${testToolsHeading} div > span`, {
  display: 'block',
  marginTop: '10px',
  color: 'var(--text-secondary)',
})

globalStyle(`${testToolsCategories} button`, {
  minWidth: '0',
  flex: '1 1 0',
  padding: '6px 10px',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  background: 'transparent',
  border: '0',
  borderRadius: '8px',
  cursor: 'pointer',
})

globalStyle(`${testToolsCategories} button:hover`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-hover)',
})

globalStyle(`${testToolsCategories} button${isActive}`, {
  color: 'var(--text-primary)',
  background: 'var(--accent-muted)',
})

globalStyle(
  `${testToolsCategories} strong,
${testToolsCategories} small`,
  {
    display: 'block',
  },
)

globalStyle(`${testToolsCategories} strong`, {
  fontSize: '11px',
})

globalStyle(`${testToolsCategories} small`, {
  marginTop: '2px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  lineHeight: '1.4',
})

globalStyle(`${testToolsResult} span`, {
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
})

globalStyle(`${testToolsResult} p`, {
  minHeight: '20px',
  margin: '9px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.6',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
})

globalStyle(`${testToolsSection} > header`, {
  marginBottom: '18px',
})

globalStyle(`${testToolsSection} h2`, {
  margin: '0',
  fontSize: '15px',
})

globalStyle(`${testToolsSection} header p`, {
  margin: '6px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
})

globalStyle(
  `${testToolsActions} button,
${testToolsButton}`,
  {
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: '700',
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-strong)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
)

globalStyle(
  `${testToolsActions} button:hover,
${testToolsButton}:hover`,
  {
    background: 'var(--surface-hover)',
  },
)

globalStyle(`${testToolsButton}${isPrimary}`, {
  color: 'var(--button-primary-text)',
  background: 'var(--accent)',
  borderColor: 'transparent',
})

globalStyle(`${testToolsDropzone} strong`, {
  fontSize: '11px',
})

globalStyle(`${testToolsDropzone} > span`, {
  marginTop: '5px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

globalStyle(`${testToolsDropzone} ul`, {
  width: '100%',
  maxHeight: '88px',
  overflow: 'auto',
  margin: '12px 0 0',
  padding: '10px 10px 0 26px',
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

globalStyle(`${testToolsHeading} h1`, {
  '@container': {
    'test-tools-panel (max-width: 480px)': {
      fontSize: 'clamp(26px, 9vw, 34px)',
    },
  },
})

globalStyle(`${testToolsCategories} button`, {
  '@container': {
    'test-tools-panel (max-width: 480px)': {
      minWidth: '112px',
    },
  },
})

globalStyle(`${testToolsCategories} small`, {
  '@container': {
    'test-tools-panel (max-width: 480px)': {
      display: 'none',
    },
  },
})
