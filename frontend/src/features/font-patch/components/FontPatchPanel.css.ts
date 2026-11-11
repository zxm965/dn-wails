import { style } from '@vanilla-extract/css'

const page = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: 'calc(18px * var(--layout-spacing))',
  minWidth: 0,
  containerName: 'font-patch-page',
  containerType: 'inline-size',
})
const card = style({ minWidth: 0, vars: { '--panel-padding': '14px 16px' } })
const upload = style({
  display: 'grid',
  gridTemplateColumns: '28px minmax(0, 1fr) 280px',
  alignItems: 'center',
  gap: '8px 18px',
  padding: '4px',
  minWidth: 0,
  minHeight: 76,
  '@container': {
    'font-patch-page (max-width: 720px)': { gridTemplateColumns: '28px minmax(0, 1fr)' },
  },
})
const uploadCopy = style({ minWidth: 0, gridColumn: 2, gridRow: 1 })
const uploadActions = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 96px',
  gap: 8,
  width: '100%',
  minWidth: 0,
  '@container': {
    'font-patch-page (max-width: 720px)': { gridColumn: 2, width: 'min(280px, 100%)' },
    'font-patch-page (max-width: 360px)': { gridColumn: '1 / -1', gridTemplateColumns: 'minmax(0, 1fr)' },
  },
})
const cancelSlot = style({
  width: '100%',
  selectors: { '&[aria-hidden="true"]': { visibility: 'hidden' } },
})
const uploadFooter = style({
  gridColumn: '2 / -1',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
  alignItems: 'end',
  gap: '4px 18px',
  minWidth: 0,
  '@container': {
    'font-patch-page (max-width: 720px)': { gridColumn: '1 / -1', gridTemplateColumns: 'minmax(0, 1fr)' },
  },
})
const uploadHint = style({
  margin: 0,
  minWidth: 0,
  minHeight: '3em',
  lineHeight: 1.5,
  display: 'flex',
  alignItems: 'end',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-secondary)',
  overflowWrap: 'anywhere',
})
const uploadFeedback = style({
  margin: 0,
  minWidth: 0,
  minHeight: '3em',
  display: 'flex',
  alignItems: 'end',
  justifyContent: 'flex-end',
  textAlign: 'right',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const icon = style({ width: 28, height: 28, flexShrink: 0, color: 'var(--accent)' })
const title = style({ margin: 0, fontSize: 'var(--font-size-title)', overflowWrap: 'anywhere' })
const description = style({ margin: '5px 0 0', color: 'var(--text-secondary)', overflowWrap: 'anywhere' })
const hint = style({
  margin: '8px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const actions = style({ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 })
const resultHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
})
const resultTitle = style({ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 180px' })
const filename = style({
  margin: '6px 0 0',
  color: 'var(--text-secondary)',
  overflowWrap: 'anywhere',
  fontSize: 'var(--font-size-secondary)',
})
const details = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 12,
  margin: '12px 0',
  '@container': {
    'font-patch-page (max-width: 760px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    'font-patch-page (max-width: 360px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
})
const notice = style({
  margin: '12px 0',
  padding: 12,
  borderRadius: 10,
  background: 'var(--accent-muted)',
  color: 'var(--text-primary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const saved = style({ margin: '8px 0 0', color: 'var(--text-primary)', overflowWrap: 'anywhere' })
const detailLabel = style({ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-secondary)' })
const detailValue = style({ margin: '4px 0 0', overflowWrap: 'anywhere' })

export const styles = {
  page,
  card,
  uploadCopy,
  uploadActions,
  cancelSlot,
  uploadHint,
  uploadFooter,
  uploadFeedback,
  upload,
  icon,
  title,
  description,
  hint,
  actions,
  resultHeader,
  resultTitle,
  filename,
  details,
  notice,
  saved,
  detailLabel,
  detailValue,
}
