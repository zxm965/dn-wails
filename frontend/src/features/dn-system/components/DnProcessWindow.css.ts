import { style } from '@vanilla-extract/css'

const singleLine = {
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

export const styles = {
  window: style({
    width: '100%',
    height: '100dvh',
    minWidth: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    padding: 12,
    background: 'var(--app-background)',
    color: 'var(--text-primary)',
    containerType: 'inline-size',
  }),
  header: style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }),
  heading: style({ ...singleLine, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }),
  hint: style({ ...singleLine, margin: 0, fontSize: 13, color: 'var(--text-secondary)' }),
  status: style({ ...singleLine, margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }),
  processes: style({
    minWidth: 0,
    maxHeight: 64,
    overflowY: 'auto',
    flexShrink: 0,
    padding: '6px 8px',
    borderRadius: 6,
    background: 'var(--surface-muted)',
  }),
  list: style({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }),
  process: style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 1.5,
  }),
  processName: style(singleLine),
  pid: style({ whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--text-tertiary)', fontSize: 11 }),
}
