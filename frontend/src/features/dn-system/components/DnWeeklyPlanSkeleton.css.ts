import { style } from '@vanilla-extract/css'

const shape = style({
  selectors: {
    '&[aria-hidden="true"]': {
      minWidth: 0,
      minHeight: 0,
      maxWidth: '100%',
      background: 'var(--border-subtle)',
      animation: 'none',
      borderRadius: 4,
    },
  },
})
// Use the same CJK line box as the loaded text, including the user's font preset.
const text = style({ '::before': { content: '"字"', visibility: 'hidden' } })
const line = style([text, { width: '70%' }])
const label = style([text, { width: '5em' }])
const description = style([text, { width: '18em' }])
const flagLabel = style([text, { width: '2em' }])
const flagStatus = style([text, { width: '3em' }])
const avatar = style({ width: 32, height: 32 })
const badge = style({ width: 42, height: 22 })
const count = style({ width: '2em', height: '1lh' })
const progress = style({ width: '100%', height: 7 })
const control = style({ width: 'var(--button-height-sm)', height: 'var(--button-height-sm)' })
const toggle = style({ width: 42, height: 24, flexShrink: 0 })
const action = style({ width: 76, height: 'var(--button-height-sm)' })

export const styles = {
  shape,
  line,
  label,
  description,
  flagLabel,
  flagStatus,
  avatar,
  badge,
  count,
  progress,
  control,
  toggle,
  action,
}
