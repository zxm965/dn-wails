import { keyframes, style } from '@vanilla-extract/css'

const spinKeyframes = keyframes({
  to: {
    transform: 'rotate(360deg)',
  },
})

const icon = style({
  animation: `${spinKeyframes} 900ms linear infinite`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
})

export const styles = {
  icon,
} as const
