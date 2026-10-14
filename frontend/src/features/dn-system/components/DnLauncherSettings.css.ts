import { style } from '@vanilla-extract/css'

export const styles = {
  card: style({ minWidth: 0, vars: { '--panel-padding': '14px 16px' } }),
  header: style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }),
  form: style({ display: 'grid', gap: 8, marginTop: 10, minWidth: 0 }),
  controls: style({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 8,
    '@container': { 'dn-process-page (max-width: 580px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
  }),
  actions: style({ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }),
  hint: style({
    margin: '8px 0 0',
    color: 'var(--text-secondary)',
    fontSize: 12,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  }),
  path: style({
    margin: '8px 0 0',
    color: 'var(--text-secondary)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  error: style({
    margin: '8px 0 0',
    color: 'var(--danger-text)',
    fontSize: 12,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  }),
}
