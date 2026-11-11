import { style } from '@vanilla-extract/css'
const root = style({
  display: 'grid',
  gap: 16,
  minWidth: 0,
  containerType: 'inline-size',
  containerName: 'composition',
})
const fonts = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
  '@container': { 'composition (max-width: 680px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
})
const box = style({
  display: 'grid',
  gap: 12,
  minWidth: 0,
  padding: 16,
  borderRadius: 12,
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
})
const toolbar = style({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 })
const title = style({ fontSize: 'var(--font-size-body)', margin: 0 })
const hint = style({
  fontSize: 'var(--font-size-secondary)',
  margin: 0,
  lineHeight: 1.6,
  color: 'var(--text-secondary)',
  overflowWrap: 'anywhere',
})
const rule = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 130px 130px',
  gap: 12,
  alignItems: 'center',
  minWidth: 0,
  '@container': { 'composition (max-width: 520px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
})
const controls = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
  gap: 20,
  '@container': { 'composition (max-width: 400px)': { gridTemplateColumns: 'minmax(0,1fr)' } },
})
const label = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
  gap: 8,
  fontSize: 'var(--font-size-secondary)',
})
const previews = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
  gap: 12,
  '@container': { 'composition (max-width: 600px)': { gridTemplateColumns: 'minmax(0,1fr)' } },
})
const sample = style({
  fontSize: 24,
  lineHeight: 1.6,
  minHeight: 42,
  margin: '8px 0',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
  fontSynthesis: 'none',
  fontWeight: 400,
})
const feedback = style({
  minHeight: '1.6em',
  fontSize: 'var(--font-size-secondary)',
  color: 'var(--text-secondary)',
  overflowWrap: 'anywhere',
  margin: 0,
})
export const styles = { root, fonts, box, toolbar, title, hint, rule, controls, label, previews, sample, feedback }
