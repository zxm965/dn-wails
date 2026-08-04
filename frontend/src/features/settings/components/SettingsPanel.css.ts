import { globalStyle, style } from '@vanilla-extract/css'

const settingsPanel = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '16px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
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
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  whiteSpace: 'nowrap',
})

const settingsButton = style([
  {
    padding: '0 16px',
    fontSize: '13px',
    fontWeight: '750',
    border: '1px solid transparent',
    borderRadius: '9px',
    cursor: 'pointer',
    ':disabled': {
      cursor: 'not-allowed',
      opacity: '0.56',
    },
  },
  {
    '@container': {
      'settings-panel (max-width: 440px)': {
        width: '100%',
        whiteSpace: 'nowrap',
      },
    },
  },
])

const settingsButtonPrimary = style({
  color: 'var(--button-primary-text)',
  background: 'var(--accent)',
})

const settingsButtonSecondary = style({
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  borderColor: 'var(--border-strong)',
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

const settingsSectionTitle = style({
  marginBottom: '22px',
})

const settingsGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '20px',
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

const settingsAccent = style({
  width: '20px',
  height: '20px',
  border: '2px solid var(--surface-elevated)',
  borderRadius: '50%',
  boxShadow: '0 0 0 1px var(--border-strong)',
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
    gap: '18px',
    padding: '14px 0',
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

export const styles = {
  'settings-panel': settingsPanel,
  'settings-state': settingsState,
  'settings-save-status': settingsSaveStatus,
  'settings-button': settingsButton,
  'settings-button-primary': settingsButtonPrimary,
  'settings-button-secondary': settingsButtonSecondary,
  'settings-error': settingsError,
  'settings-section': settingsSection,
  'settings-section-title': settingsSectionTitle,
  'settings-grid': settingsGrid,
  'settings-fieldset': settingsFieldset,
  'settings-field': settingsField,
  'settings-accent': settingsAccent,
  'is-green': isGreen,
  'is-blue': isBlue,
  'is-purple': isPurple,
  'is-orange': isOrange,
  'settings-toggles': settingsToggles,
  'settings-toggle-row': settingsToggleRow,
  'is-disabled': isDisabled,
} as const

globalStyle(`${settingsSectionTitle} h2`, {
  margin: '0',
  fontSize: '17px',
})

globalStyle(`${settingsSectionTitle} p`, {
  margin: '7px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  lineHeight: '1.55',
})

globalStyle(
  `${settingsFieldset} legend,
${settingsField} > span`,
  {
    display: 'block',
    marginBottom: '9px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: '700',
  },
)

globalStyle(`${settingsToggleRow} > span:first-child`, {
  minWidth: '0',
})

globalStyle(
  `${settingsToggleRow} strong,
${settingsToggleRow} small`,
  {
    display: 'block',
  },
)

globalStyle(`${settingsToggleRow} strong`, {
  fontSize: '13px',
})

globalStyle(`${settingsToggleRow} small`, {
  marginTop: '5px',
  color: 'var(--text-tertiary)',
  lineHeight: '1.45',
})

globalStyle(`${settingsToggleRow} small`, {
  '@container': {
    'settings-panel (max-width: 440px)': {
      overflowWrap: 'anywhere',
    },
  },
})
