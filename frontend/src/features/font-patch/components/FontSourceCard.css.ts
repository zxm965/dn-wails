import { style } from '@vanilla-extract/css'
const root = style({
  minWidth: 0,
  display: 'grid',
  gap: 12,
  padding: 16,
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  background: 'var(--surface-elevated)',
})
const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
})
const title = style({ margin: 0, fontSize: 'var(--font-size-body)' })
const hint = style({
  margin: 0,
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  overflowWrap: 'anywhere',
})
const rows = style({ display: 'grid', gap: 8 })
const row = style({ minWidth: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 })
const sample = style({
  fontSize: 24,
  lineHeight: 1.5,
  minHeight: 36,
  margin: 0,
  overflowWrap: 'anywhere',
  fontSynthesis: 'none',
  fontWeight: 400,
})
const placeholder = style([
  sample,
  { fontSize: 'var(--font-size-secondary)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' },
])
const gallery = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
  gap: 4,
  minWidth: 0,
})
const glyph = style({
  textAlign: 'center',
  fontSize: 24,
  lineHeight: '40px',
  minWidth: 0,
  overflow: 'hidden',
  borderRadius: 4,
  background: 'var(--accent-muted)',
  fontSynthesis: 'none',
})
const toolbar = style({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 })
export const styles = { root, header, title, hint, rows, row, sample, placeholder, gallery, glyph, toolbar }
