import { globalStyle, style } from '@vanilla-extract/css'

const settingsPanel = style({
  width: 'min(940px, 100%)',
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

const settingsHeading = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '28px',
  },
  {
    '@container': {
      'settings-panel (max-width: 700px)': {
        flexDirection: 'column',
      },
    },
  },
])

const settingsHeadingActions = style([
  {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  {
    '@container': {
      'settings-panel (max-width: 700px)': {
        width: '100%',
        justifyContent: 'space-between',
      },
    },
  },
  {
    '@container': {
      'settings-panel (max-width: 440px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

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
      'settings-panel (max-width: 700px)': {
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
  selectors: {
    '& + &': {
      marginTop: '18px',
    },
  },
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

const settingsSegmented = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  padding: '3px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
})

const isSelected = style({
  selectors: {
    [`${settingsSegmented} label&`]: {
      color: 'var(--text-primary)',
      background: 'var(--surface-elevated)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    },
  },
})

const settingsAccents = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
})

const settingsAccent = style({
  width: '24px',
  height: '24px',
  border: '3px solid var(--surface-elevated)',
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

const settingsRange = style({})

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

const settingsSwitch = style({
  position: 'relative',
  width: '42px',
  height: '24px',
  flex: '0 0 auto',
  background: 'var(--switch-background)',
  borderRadius: '999px',
  transition: 'background-color 150ms ease',
  '::after': {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: '18px',
    height: '18px',
    background: '#ffffff',
    borderRadius: '50%',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.28)',
    transition: 'transform 150ms ease',
    content: "''",
  },
  selectors: {
    [`${settingsToggleRow} input:checked + &`]: {
      background: 'var(--accent)',
    },
    [`${settingsToggleRow} input:checked + &::after`]: {
      transform: 'translateX(18px)',
    },
    [`${settingsToggleRow} input:focus-visible + &`]: {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '2px',
    },
  },
})

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
  'settings-heading': settingsHeading,
  'settings-heading-actions': settingsHeadingActions,
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
  'settings-segmented': settingsSegmented,
  'is-selected': isSelected,
  'settings-accents': settingsAccents,
  'settings-accent': settingsAccent,
  'is-green': isGreen,
  'is-blue': isBlue,
  'is-purple': isPurple,
  'is-orange': isOrange,
  'settings-range': settingsRange,
  'settings-toggles': settingsToggles,
  'settings-toggle-row': settingsToggleRow,
  'settings-switch': settingsSwitch,
  'is-disabled': isDisabled,
} as const

globalStyle(`${settingsHeading} > div:first-child`, {
  minWidth: '0',
})

globalStyle(`${settingsHeading} p`, {
  margin: '0 0 8px',
  color: 'var(--accent)',
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${settingsHeading} h1`, {
  margin: '0',
  fontSize: 'clamp(28px, 4vw, 38px)',
})

globalStyle(`${settingsHeading} span`, {
  display: 'block',
  color: 'var(--text-secondary)',
})

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

globalStyle(`${settingsSegmented} label`, {
  display: 'grid',
  minHeight: 'var(--control-height)',
  placeItems: 'center',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  borderRadius: '7px',
  cursor: 'pointer',
})

globalStyle(
  `${settingsSegmented} input,
${settingsAccents} input`,
  {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  },
)

globalStyle(`${settingsAccents} label`, {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
})

globalStyle(`${settingsAccents} label:has(input:checked)`, {
  color: 'var(--text-primary)',
  fontWeight: '700',
})

globalStyle(`${settingsField} select`, {
  width: '100%',
  height: 'var(--control-height)',
  padding: '0 11px',
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '9px',
  outline: 'none',
})

globalStyle(`${settingsRange} input`, {
  width: '100%',
  accentColor: 'var(--accent)',
})

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

globalStyle(`${settingsToggleRow} input`, {
  position: 'absolute',
  opacity: '0',
})

globalStyle(`${settingsHeading} h1`, {
  '@container': {
    'settings-panel (max-width: 440px)': {
      fontSize: 'clamp(26px, 9vw, 34px)',
    },
  },
})

globalStyle(`${settingsToggleRow} small`, {
  '@container': {
    'settings-panel (max-width: 440px)': {
      overflowWrap: 'anywhere',
    },
  },
})
