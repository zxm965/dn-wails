import { style } from '@vanilla-extract/css'

const root = style({
  minWidth: 0,
  padding: 'var(--panel-padding)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  containerType: 'inline-size',
  containerName: 'menu-preferences',
  overflowAnchor: 'none',
})
const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 20,
})
const title = style({ margin: '0 0 7px', fontSize: 'var(--font-size-title)' })
const description = style({
  display: 'block',
  margin: '5px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const groups = style({ display: 'grid', gap: 'calc(20px * var(--layout-spacing))', minWidth: 0 })
const group = style({ minWidth: 0 })
const groupTitle = style({ margin: '0 0 10px', fontSize: 'var(--font-size-body)', color: 'var(--text-secondary)' })
const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: 'calc(8px * var(--layout-spacing))',
  minWidth: 0,
})
const item = style({ minWidth: 0 })
const row = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(10px * var(--layout-spacing))',
  flexWrap: 'wrap',
  padding: 'calc(10px * var(--layout-spacing))',
  minWidth: 0,
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  background: 'var(--surface-muted)',
  transition: 'border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
  selectors: {
    '&[data-drop]::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      borderRadius: 2,
      background: 'var(--accent)',
      pointerEvents: 'none',
    },
    '&[data-drop="before"]::after': { top: -6 },
    '&[data-drop="after"]::after': { bottom: -6 },
    '&[data-dragging]': {
      borderColor: 'var(--accent)',
      background: 'var(--accent-muted)',
      opacity: 0.35,
      borderStyle: 'dashed',
    },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
  '@container': {
    'menu-preferences (max-width: 420px)': {
      gap: 'calc(8px * var(--layout-spacing))',
      padding: 'calc(8px * var(--layout-spacing))',
    },
  },
})
const copy = style({ flex: '1 1 120px', minWidth: 0, overflowWrap: 'anywhere' })
const label = style({ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-body)' })
const actions = style({ display: 'flex', alignItems: 'center', flex: '0 0 auto', gap: 4, marginLeft: 'auto' })
const visibility = style({ display: 'flex', alignItems: 'center', flex: '0 0 auto' })
const fixed = style({ fontSize: 'var(--font-size-secondary)', color: 'var(--text-tertiary)' })
const handle = style({
  flex: '0 0 auto',
  padding: '0 6px',
  cursor: 'grab',
  touchAction: 'none',
  userSelect: 'none',
  ':active': { cursor: 'grabbing' },
})
const children = style({
  listStyle: 'none',
  margin: '8px 0 0 22px',
  padding: '0 0 0 calc(10px * var(--layout-spacing))',
  display: 'grid',
  gap: 'calc(6px * var(--layout-spacing))',
  borderLeft: '2px solid var(--border-subtle)',
  '@container': {
    'menu-preferences (max-width: 420px)': { marginLeft: 8, paddingLeft: 'calc(6px * var(--layout-spacing))' },
  },
})
const ghost = style({
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 1000,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 10,
  boxSizing: 'border-box',
  border: '1px solid var(--accent)',
  borderRadius: 10,
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--surface-shadow)',
  opacity: 0.95,
  willChange: 'transform',
  overflowWrap: 'anywhere',
  userSelect: 'none',
})

const live = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
})
export const styles = {
  ghost,
  root,
  header,
  title,
  description,
  groups,
  group,
  groupTitle,
  list,
  item,
  row,
  copy,
  label,
  actions,
  visibility,
  fixed,
  handle,
  children,
  live,
}
