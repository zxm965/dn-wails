import { globalStyle, style } from '@vanilla-extract/css'

const settingsPanel = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: 'calc(12px * var(--layout-spacing))',
  margin: '0 auto',
  padding: 'calc(16px * var(--layout-spacing)) var(--page-padding-inline)',
  containerName: 'settings-panel',
  containerType: 'inline-size',
})

const settingsState = style({
  display: 'grid',
  minHeight: '100%',
  placeItems: 'center',
  color: 'var(--text-secondary)',
})

const settingsSaveStatus = style({
  margin: '0',
  minWidth: '7em',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-secondary)',
  whiteSpace: 'nowrap',
})

const settingsUpdateContent = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'calc(20px * var(--layout-spacing))',
  },
  {
    '@container': {
      'settings-panel (max-width: 520px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const settingsUpdateError = style({
  margin: '12px 0 0',
  color: 'var(--danger-text)',
  fontSize: 'var(--font-size-secondary)',
})

const settingsUpdateProgress = style({
  display: 'grid',
  gap: '5px',
  marginTop: '12px',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
})

const settingsUpdateProgressBar = style({
  width: 'min(360px, 100%)',
  height: '7px',
  accentColor: 'var(--accent)',
})

const settingsError = style({
  padding: '12px 14px',
  color: 'var(--danger-text)',
  background: 'var(--danger-background)',
  border: '1px solid var(--danger-border)',
  borderRadius: '10px',
})

const settingsSection = style({
  padding: 'var(--panel-padding)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const overview = style({
  display: 'grid',
  minWidth: 0,
  gap: 'calc(12px * var(--layout-spacing))',
})

const updateSection = style({
  padding: 'calc(16px * var(--layout-spacing))',
})

const settingsSectionTitle = style({
  marginBottom: 'calc(22px * var(--layout-spacing))',
  selectors: {
    [`${updateSection} &`]: { marginBottom: 'calc(12px * var(--layout-spacing))' },
  },
})

const settingsGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'calc(20px * var(--layout-spacing))',
  },
  {
    '@container': {
      'settings-panel (max-width: 700px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const settingsFieldset = style({
  minWidth: '0',
  margin: '0',
  padding: '0',
  border: '0',
})

const settingsField = style({})

const compactOptions = style({
  width: 'min(100%, 300px)',
  vars: { '--radio-segment-height': 'var(--button-height-sm)' },
})

const settingsAccent = style({
  width: '20px',
  height: '20px',
  border: '2px solid var(--surface-elevated)',
  borderRadius: '50%',
  boxShadow: '0 0 0 1px var(--border-strong)',
})

const settingsButtonSizeOptions = style({
  width: 'min(100%, 300px)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  height: '36px',
  minHeight: '36px',
  padding: '0',
  background: 'transparent',
  border: '0',
})

const settingsButtonSizeButton = style({
  flex: '1 1 0',
  minWidth: '0',
  padding: '0 10px',
})

const settingsButtonSizeButtonSelected = style({
  color: 'var(--accent-hover)',
  background: 'var(--accent-muted)',
  borderColor: 'color-mix(in srgb, var(--accent) 45%, var(--border-strong))',
  boxShadow: 'none',
  selectors: {
    '&:hover:not(:disabled)': {
      color: 'var(--accent-hover)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 45%, var(--border-strong))',
    },
  },
})

const isGreen = style({
  background: '#07c160',
})

const isBlue = style({
  background: '#3488ff',
})

const isPurple = style({
  background: '#8b5cf6',
})

const isOrange = style({
  background: '#ef8b2c',
})

const settingsToggles = style({
  display: 'flex',
  flexDirection: 'column',
})

const settingsToggleRow = style([
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'calc(18px * var(--layout-spacing))',
    padding: 'calc(14px * var(--layout-spacing)) 0',
    cursor: 'pointer',
    selectors: {
      '& + &': {
        borderTop: '1px solid var(--border-subtle)',
      },
    },
  },
  {
    '@container': {
      'settings-panel (max-width: 440px)': {
        alignItems: 'flex-start',
      },
    },
  },
])

const isDisabled = style({
  selectors: {
    [`${settingsToggleRow}&`]: {
      cursor: 'not-allowed',
      opacity: '0.48',
    },
  },
})

const settingsToggleText = style({
  minWidth: '0',
})

const settingsToggleTitle = style({
  display: 'block',
  fontSize: 'var(--font-size-body)',
  overflowWrap: 'anywhere',
})

const settingsToggleDescription = style({
  display: 'block',
  marginTop: '5px',
  color: 'var(--text-tertiary)',
  lineHeight: '1.45',
  '@container': {
    'settings-panel (max-width: 440px)': {
      overflowWrap: 'anywhere',
    },
  },
})

const fontPreview = style({
  display: 'grid',
  width: 'min(100%, 300px)',
  gap: 4,
  minWidth: 0,
  marginTop: 8,
  padding: 10,
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  background: 'var(--surface-muted)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const fontPreviewTitle = style({ fontSize: 'var(--font-size-title)' })
const fontPreviewBody = style({ fontSize: 'var(--font-size-body)' })
const fontPreviewDescription = style({
  fontSize: 'var(--font-size-secondary)',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})

const header = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minWidth: 0,
})
const title = style({ margin: 0, fontSize: 'var(--font-size-title)' })
const headerActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  selectors: { '&[data-hidden="true"]': { visibility: 'hidden' } },
})

export const styles = {
  overview,
  updateSection,
  header,
  title,
  headerActions,
  compactOptions,
  fontPreview,
  fontPreviewTitle,
  fontPreviewBody,
  fontPreviewDescription,
  'settings-panel': settingsPanel,
  'settings-state': settingsState,
  'settings-save-status': settingsSaveStatus,
  'settings-update-content': settingsUpdateContent,
  'settings-update-error': settingsUpdateError,
  'settings-update-progress': settingsUpdateProgress,
  'settings-update-progress-bar': settingsUpdateProgressBar,
  'settings-error': settingsError,
  'settings-section': settingsSection,
  'settings-section-title': settingsSectionTitle,
  'settings-grid': settingsGrid,
  'settings-fieldset': settingsFieldset,
  'settings-field': settingsField,
  'settings-accent': settingsAccent,
  'settings-button-size-options': settingsButtonSizeOptions,
  'settings-button-size-button': settingsButtonSizeButton,
  'settings-button-size-button-selected': settingsButtonSizeButtonSelected,
  'is-green': isGreen,
  'is-blue': isBlue,
  'is-purple': isPurple,
  'is-orange': isOrange,
  'settings-toggles': settingsToggles,
  'settings-toggle-row': settingsToggleRow,
  'settings-toggle-text': settingsToggleText,
  'settings-toggle-title': settingsToggleTitle,
  'settings-toggle-description': settingsToggleDescription,
  'is-disabled': isDisabled,
} as const

globalStyle(`${settingsSectionTitle} h2`, {
  margin: '0',
  fontSize: 'var(--font-size-title)',
})

globalStyle(`${settingsSectionTitle} p`, {
  margin: '7px 0 0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-body)',
  lineHeight: '1.55',
})

globalStyle(`${settingsUpdateContent} > div`, {
  minWidth: '0',
})

globalStyle(`${settingsUpdateContent} strong`, {
  display: 'block',
  fontSize: 'var(--font-size-body)',
})

globalStyle(`${settingsUpdateContent} small`, {
  display: 'block',
  marginTop: '7px',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  overflowWrap: 'anywhere',
})

globalStyle(`${settingsUpdateContent} button`, {
  flex: '0 0 auto',
  '@container': {
    'settings-panel (max-width: 520px)': {
      width: '100%',
    },
  },
})

globalStyle(
  `${settingsFieldset} legend,
${settingsField} > span`,
  {
    display: 'block',
    marginBottom: '9px',
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-secondary)',
    fontWeight: '700',
  },
)
