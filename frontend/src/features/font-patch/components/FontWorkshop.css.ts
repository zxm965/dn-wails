import { style } from '@vanilla-extract/css'
const page = style({
  width: 'min(var(--page-content-max-width), 100%)',
  minWidth: 0,
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  display: 'grid',
  gap: 'calc(18px * var(--layout-spacing))',
})
const actions = style({
  width: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
})
export const styles = { page, actions }
