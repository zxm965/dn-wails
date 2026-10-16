import { style } from '@vanilla-extract/css'

export const styles = {
  entry: style({
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 180,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
  }),
  form: style({ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }),
  fields: style({ display: 'grid', gap: 8, minWidth: 0 }),
  fileAction: style({ display: 'flex', justifyContent: 'flex-end' }),
  hint: style({
    margin: 0,
    marginRight: 'auto',
    color: 'var(--text-secondary)',
    fontSize: 12,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  }),
  error: style({ margin: 0, color: 'var(--danger-text)', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' }),
}
