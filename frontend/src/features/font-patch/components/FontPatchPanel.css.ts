import { style } from '@vanilla-extract/css'

const page = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: 'calc(18px * var(--layout-spacing))',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  minWidth: 0,
  containerName: 'font-patch-page',
  containerType: 'inline-size',
})
const card = style({ minWidth: 0, vars: { '--panel-padding': '14px 16px' } })
const upload = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 8,
  padding: '8px 12px',
  minWidth: 0,
})
const uploadCopy = style({ minWidth: 0 })
const uploadHint = style({ margin: '4px 0 0', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-secondary)' })
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
  uploadHint,
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
