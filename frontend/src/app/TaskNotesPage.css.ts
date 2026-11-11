import { style } from '@vanilla-extract/css'

const page = style({
  width: 'min(100%, var(--page-content-max-width))',
  minWidth: 0,
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
})

export const styles = { page }
