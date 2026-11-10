import { style } from '@vanilla-extract/css'

const root = style({ display: 'grid', gap: 10, minWidth: 0 })
const controls = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px' })
const control = style({ flex: '1 1 180px', minWidth: 0 })
const label = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 'var(--font-size-secondary)',
  marginBottom: 6,
})
const editorHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  fontSize: 'var(--font-size-secondary)',
})
const displaySize = style({ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-secondary)' })
const sizeInput = style({ width: 66, minWidth: 0 })
const textInput = style({ minHeight: 56, resize: 'vertical', maxHeight: 120 })
const sample = style({
  height: 128,
  minHeight: 128,
  overflow: 'auto',
  borderRadius: 10,
  padding: '12px 16px',
  background: 'var(--accent-muted)',
  minWidth: 0,
})
const rendered = style({
  margin: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  lineHeight: 1.5,
  fontSynthesis: 'none',
  fontWeight: 400,
})
const status = style({ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-secondary)' })
const footer = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
})
const hint = style({
  margin: 0,
  flex: '1 1 260px',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
})

export const styles = {
  root,
  controls,
  control,
  label,
  editorHeader,
  displaySize,
  sizeInput,
  textInput,
  sample,
  rendered,
  status,
  footer,
  hint,
}
