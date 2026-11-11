import { style } from '@vanilla-extract/css'

const page = style({
  minWidth: 0,
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
})
const card = style({
  width: 'min(560px, 100%)',
  margin: '0 auto',
  padding: 'var(--panel-padding)',
  display: 'grid',
  gap: 'calc(16px * var(--layout-spacing))',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  overflowWrap: 'anywhere',
})
const title = style({
  margin: 0,
  fontSize: 'var(--font-size-subtitle)',
  ':focus-visible': { outline: '2px solid var(--focus-ring)', outlineOffset: 4 },
})
const description = style({ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 })
const actions = style({ display: 'flex', flexWrap: 'wrap', gap: 8 })

export const styles = { page, card, title, description, actions }
