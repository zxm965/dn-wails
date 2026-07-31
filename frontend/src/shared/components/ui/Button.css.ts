import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const uiButtonRippleKeyframes = keyframes({
  to: {
    opacity: '0',
    transform: 'scale(1)',
  },
})

const uiButton = style({
  position: 'relative',
  height: 'var(--button-height-default)',
  minHeight: 'var(--button-height-default)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  overflow: 'hidden',
  padding: '0 12px',
  color: 'var(--button-primary-text)',
  fontSize: '13px',
  fontWeight: '700',
  whiteSpace: 'nowrap',
  background: 'var(--accent)',
  border: '1px solid transparent',
  borderRadius: '9px',
  cursor: 'pointer',
  transition:
    'color 140ms ease,\n    background-color 140ms ease,\n    border-color 140ms ease,\n    box-shadow 140ms ease,\n    transform 100ms ease',
  userSelect: 'none',
})

const uiButtonSecondary = style({
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  borderColor: 'var(--border-subtle)',
})

const uiButtonOutline = style({
  color: 'var(--text-primary)',
  background: 'transparent',
  borderColor: 'var(--border-strong)',
})

const uiButtonGhost = style({
  color: 'var(--text-secondary)',
  background: 'transparent',
  borderColor: 'transparent',
})

const uiButtonDanger = style({
  color: '#ffffff',
  background: '#d84d45',
})

const uiButtonRipple = style({
  position: 'absolute',
  pointerEvents: 'none',
  background: 'currentColor',
  borderRadius: '999px',
  opacity: '0.18',
  transform: 'scale(0)',
  animation: `${uiButtonRippleKeyframes} 520ms ease-out`,
})

export const classes = {
  'ui-button': uiButton,
  'ui-button-secondary': uiButtonSecondary,
  'ui-button-outline': uiButtonOutline,
  'ui-button-ghost': uiButtonGhost,
  'ui-button-danger': uiButtonDanger,
  'ui-button-ripple': uiButtonRipple,
} as const

globalStyle(`${uiButton}:hover:not(:disabled)`, {
  background: 'var(--accent-hover)',
})

globalStyle(`${uiButton}:active:not(:disabled)`, {
  transform: 'translateY(1px)',
})

globalStyle(`${uiButton}:focus-visible`, {
  outline: '2px solid var(--focus-ring)',
  outlineOffset: '2px',
})

globalStyle(
  `${uiButton}:disabled,
${uiButton}[aria-disabled='true']`,
  {
    cursor: 'not-allowed',
    opacity: '0.5',
  },
)

globalStyle(`${uiButtonSecondary}:hover:not(:disabled)`, {
  background: 'var(--surface-hover)',
})

globalStyle(
  `${uiButtonOutline}:hover:not(:disabled),
${uiButtonGhost}:hover:not(:disabled)`,
  {
    color: 'var(--text-primary)',
    background: 'var(--surface-hover)',
  },
)

globalStyle(`${uiButtonDanger}:hover:not(:disabled)`, {
  background: '#c8433c',
})

globalStyle(`${uiButton} svg`, {
  width: '16px',
  height: '16px',
  flex: '0 0 auto',
  pointerEvents: 'none',
})

globalStyle(`${uiButton}[data-button-size='sm']`, {
  height: 'var(--button-height-sm)',
  minHeight: 'var(--button-height-sm)',
})

globalStyle(`${uiButton}[data-button-size='md']`, {
  height: 'var(--button-height-md)',
  minHeight: 'var(--button-height-md)',
})

globalStyle(`${uiButton}[data-button-size='lg']`, {
  height: 'var(--button-height-lg)',
  minHeight: 'var(--button-height-lg)',
})

globalStyle(':root', {
  vars: {
    '--button-height-sm': '28px',
    '--button-height-md': '32px',
    '--button-height-lg': '36px',
    '--button-height-default': 'var(--button-height-md)',
  },
})

globalStyle(":root[data-button-size='sm']", {
  vars: {
    '--button-height-default': 'var(--button-height-sm)',
  },
})

globalStyle(":root[data-button-size='md']", {
  vars: {
    '--button-height-default': 'var(--button-height-md)',
  },
})

globalStyle(":root[data-button-size='lg']", {
  vars: {
    '--button-height-default': 'var(--button-height-lg)',
  },
})
