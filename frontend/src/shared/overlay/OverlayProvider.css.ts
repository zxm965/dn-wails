import { style } from '@vanilla-extract/css'

const overlayContent = style({
  color: 'var(--text-secondary)',
  lineHeight: '1.65',
})

export const styles = {
  'overlay-content': overlayContent,
} as const
