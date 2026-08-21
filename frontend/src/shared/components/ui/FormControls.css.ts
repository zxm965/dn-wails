import { globalStyle, style, styleVariants } from '@vanilla-extract/css'

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
  height: 'var(--button-height-default)',
  minHeight: 'var(--button-height-default)',
  padding: '0 11px',
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '9px',
  outline: 'none',
  transition: 'border-color 140ms ease,\n    box-shadow 140ms ease,\n    background-color 140ms ease',
  ':disabled': {
    cursor: 'not-allowed',
    opacity: '0.55',
  },
  ':focus': {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-muted)',
  },
  '::placeholder': {
    color: 'var(--text-tertiary)',
  },
})

const sizes = styleVariants({
  sm: {
    height: 'var(--button-height-sm)',
    minHeight: 'var(--button-height-sm)',
  },
  md: {
    height: 'var(--button-height-md)',
    minHeight: 'var(--button-height-md)',
  },
  lg: {
    height: 'var(--button-height-lg)',
    minHeight: 'var(--button-height-lg)',
  },
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

const uiPasswordInputToggle = style({
  selectors: {
    [`${uiPasswordInput} > &`]: {
      position: 'absolute',
      top: '50%',
      right: '3px',
      zIndex: '1',
      minWidth: '30px',
      padding: '0',
      translate: '0 -50%',
    },
  },
})

const uiTextarea = style({
  minHeight: '92px',
  paddingTop: '10px',
  paddingBottom: '10px',
  resize: 'vertical',
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
  ':disabled': {
    cursor: 'not-allowed',
    opacity: '0.5',
  },
  ':focus-visible': {
    outline: '2px solid var(--focus-ring)',
    outlineOffset: '2px',
  },
  selectors: {
    '&[data-checked]': {
      background: 'var(--accent)',
      borderColor: 'var(--accent)',
    },
  },
})

const uiSwitch = style([
  {
    position: 'relative',
    width: '42px',
    height: '24px',
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0',
    background: 'var(--switch-background)',
    border: '0',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    ':focus-visible': {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '2px',
    },
    selectors: {
      '&[data-checked]': {
        background: 'var(--accent)',
      },
      '&[data-disabled]': {
        cursor: 'not-allowed',
        opacity: '0.5',
      },
    },
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
])

const uiCheckboxIndicator = style({
  width: '13px',
  height: '13px',
})

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
    selectors: {
      [`${uiSwitch}[data-checked] &`]: {
        transform: 'translateX(21px)',
      },
    },
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
])

export const styles = {
  'ui-label': uiLabel,
  'ui-input': uiInput,
  'ui-password-input': uiPasswordInput,
  'ui-password-input-control': uiPasswordInputControl,
  'ui-password-input-toggle': uiPasswordInputToggle,
  'ui-textarea': uiTextarea,
  'ui-checkbox': uiCheckbox,
  'ui-switch': uiSwitch,
  'ui-checkbox-indicator': uiCheckboxIndicator,
  'ui-switch-thumb': uiSwitchThumb,
} as const

export { sizes }

globalStyle(`${uiPasswordInputToggle} svg`, {
  width: '15px',
  height: '15px',
})

globalStyle(`${uiCheckboxIndicator} svg`, {
  width: '13px',
  height: '13px',
})
