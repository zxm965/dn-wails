import { globalStyle, style } from '@vanilla-extract/css'

const uiLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: '700',
})

const uiInput = style({
  width: '100%',
  minWidth: '0',
  height: 'var(--control-height)',
  padding: '0 11px',
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '9px',
  outline: 'none',
  transition: 'border-color 140ms ease,\n    box-shadow 140ms ease,\n    background-color 140ms ease',
})

const uiPasswordInput = style({
  position: 'relative',
  width: '100%',
  minWidth: '0',
  display: 'block',
})

const uiPasswordInputControl = style({
  paddingRight: '42px',
})

const uiPasswordInputToggle = style({})

const uiTextarea = style({
  minHeight: '92px',
  paddingTop: '10px',
  paddingBottom: '10px',
  resize: 'vertical',
})

const uiSelect = style({
  appearance: 'auto',
})

const uiCheckbox = style({
  width: '18px',
  height: '18px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  padding: '0',
  color: 'var(--button-primary-text)',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '5px',
  cursor: 'pointer',
})

const uiSwitch = style({
  position: 'relative',
  width: '42px',
  height: '24px',
  flex: '0 0 auto',
  padding: '0',
  background: 'var(--switch-background)',
  border: '0',
  borderRadius: '999px',
  cursor: 'pointer',
})

const uiCheckboxIndicator = style({})

const uiSwitchThumb = style([
  {
    width: '18px',
    height: '18px',
    display: 'block',
    background: '#ffffff',
    borderRadius: '50%',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.28)',
    transform: 'translateX(3px)',
    transition: 'transform 150ms ease',
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
])

export const classes = {
  'ui-label': uiLabel,
  'ui-input': uiInput,
  'ui-password-input': uiPasswordInput,
  'ui-password-input-control': uiPasswordInputControl,
  'ui-password-input-toggle': uiPasswordInputToggle,
  'ui-textarea': uiTextarea,
  'ui-select': uiSelect,
  'ui-checkbox': uiCheckbox,
  'ui-switch': uiSwitch,
  'ui-checkbox-indicator': uiCheckboxIndicator,
  'ui-switch-thumb': uiSwitchThumb,
} as const

globalStyle(`${uiInput}::placeholder`, {
  color: 'var(--text-tertiary)',
})

globalStyle(`${uiInput}:focus`, {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 3px var(--accent-muted)',
})

globalStyle(`${uiInput}:disabled`, {
  cursor: 'not-allowed',
  opacity: '0.55',
})

globalStyle(`${uiPasswordInput} > ${uiPasswordInputToggle}`, {
  position: 'absolute',
  top: '50%',
  right: '3px',
  zIndex: '1',
  minWidth: '30px',
  padding: '0',
  translate: '0 -50%',
})

globalStyle(`${uiPasswordInputToggle} svg`, {
  width: '15px',
  height: '15px',
})

globalStyle(`${uiCheckbox}[data-checked]`, {
  background: 'var(--accent)',
  borderColor: 'var(--accent)',
})

globalStyle(
  `${uiCheckbox}:focus-visible,
${uiSwitch}:focus-visible`,
  {
    outline: '2px solid var(--focus-ring)',
    outlineOffset: '2px',
  },
)

globalStyle(
  `${uiCheckbox}:disabled,
${uiSwitch}:disabled`,
  {
    cursor: 'not-allowed',
    opacity: '0.5',
  },
)

globalStyle(
  `${uiCheckboxIndicator},
${uiCheckboxIndicator} svg`,
  {
    width: '13px',
    height: '13px',
  },
)

globalStyle(`${uiSwitch}[data-checked]`, {
  background: 'var(--accent)',
})

globalStyle(`${uiSwitch}[data-checked] ${uiSwitchThumb}`, {
  transform: 'translateX(21px)',
})
