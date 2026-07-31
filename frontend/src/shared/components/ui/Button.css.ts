import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css'

const rippleKeyframes = keyframes({
  to: {
    opacity: '0',
    transform: 'scale(1)',
  },
})

const root = style({
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
    'color 140ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 100ms ease',
  userSelect: 'none',
  ':disabled': {
    cursor: 'not-allowed',
    opacity: '0.5',
  },
  ':focus-visible': {
    outline: '2px solid var(--focus-ring)',
    outlineOffset: '2px',
  },
  selectors: {
    '&:active:not(:disabled)': {
      transform: 'translateY(1px)',
    },
    '&[aria-disabled="true"]': {
      cursor: 'not-allowed',
      opacity: '0.5',
    },
  },
})

const variants = styleVariants({
  primary: {
    selectors: {
      '&:hover:not(:disabled)': {
        background: 'var(--accent-hover)',
      },
    },
  },
  secondary: {
    color: 'var(--text-primary)',
    background: 'var(--surface-muted)',
    borderColor: 'var(--border-subtle)',
    selectors: {
      '&:hover:not(:disabled)': {
        background: 'var(--surface-hover)',
      },
    },
  },
  outline: {
    color: 'var(--text-primary)',
    background: 'transparent',
    borderColor: 'var(--border-strong)',
    selectors: {
      '&:hover:not(:disabled)': {
        color: 'var(--text-primary)',
        background: 'var(--surface-hover)',
      },
    },
  },
  ghost: {
    color: 'var(--text-secondary)',
    background: 'transparent',
    borderColor: 'transparent',
    selectors: {
      '&:hover:not(:disabled)': {
        color: 'var(--text-primary)',
        background: 'var(--surface-hover)',
      },
    },
  },
  danger: {
    color: '#ffffff',
    background: '#d84d45',
    selectors: {
      '&:hover:not(:disabled)': {
        background: '#c8433c',
      },
    },
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

const ripple = style({
  position: 'absolute',
  pointerEvents: 'none',
  background: 'currentColor',
  borderRadius: '999px',
  opacity: '0.18',
  transform: 'scale(0)',
  animation: `${rippleKeyframes} 520ms ease-out`,
})

export const styles = {
  root,
  variants,
  sizes,
  ripple,
}

globalStyle(`${root} svg`, {
  width: '16px',
  height: '16px',
  flex: '0 0 auto',
  pointerEvents: 'none',
})
