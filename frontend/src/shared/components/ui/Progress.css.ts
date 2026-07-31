import { style } from '@vanilla-extract/css'

const uiProgress = style({})

const uiProgressTrack = style({
  position: 'relative',
  width: '100%',
  height: '7px',
  overflow: 'hidden',
  background: 'var(--surface-muted)',
  borderRadius: '999px',
})

const uiProgressIndicator = style([
  {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: 'inherit',
    transition: 'width 180ms ease',
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
  'ui-progress': uiProgress,
  'ui-progress-track': uiProgressTrack,
  'ui-progress-indicator': uiProgressIndicator,
} as const
