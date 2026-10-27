import { style } from '@vanilla-extract/css'

const dialog = style({ containerType: 'inline-size', containerName: 'update-dialog' })
const title = style({ overflowWrap: 'anywhere' })
const body = style({ minWidth: 0 })
const heading = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
})
const sectionTitle = style({ margin: 0, fontSize: 'var(--font-size-body)' })
const date = style({ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-secondary)' })
const releaseName = style({ margin: '12px 0 0', color: 'var(--text-secondary)', overflowWrap: 'anywhere' })
const notes = style({
  padding: 0,
  marginTop: 16,
  overflowY: 'visible',
  '@container': { 'update-dialog (max-width: 360px)': { fontSize: 'var(--font-size-secondary)' } },
})
const empty = style({ margin: '16px 0 0', color: 'var(--text-tertiary)', lineHeight: 1.6 })

export const styles = { dialog, title, body, heading, sectionTitle, date, releaseName, notes, empty }
