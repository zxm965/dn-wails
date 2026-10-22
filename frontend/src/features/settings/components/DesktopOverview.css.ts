import { style } from '@vanilla-extract/css'

const card = style({
  minWidth: 0,
  display: 'grid',
  gap: 'calc(16px * var(--layout-spacing))',
  padding: 'var(--panel-padding)',
  borderRadius: 'var(--panel-radius)',
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated) 92%, var(--accent) 8%), var(--surface-elevated))',
  border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border-subtle))',
  containerName: 'desktop-overview',
  containerType: 'inline-size',
})
const summary = style({
  minWidth: 0,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'calc(16px * var(--layout-spacing))',
})
const identity = style({ display: 'flex', alignItems: 'center', minWidth: 0, gap: 12 })
const identityCopy = style({ minWidth: 0 })
const logo = style({ width: 44, height: 44, flexShrink: 0 })
const name = style({ margin: 0, fontSize: 'var(--font-size-title)', overflowWrap: 'anywhere' })
const author = style({
  margin: '5px 0 0',
  fontSize: 'var(--font-size-caption)',
  color: 'var(--text-secondary)',
  overflowWrap: 'anywhere',
})
const runtime = style({
  width: '24ch',
  maxWidth: '100%',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  color: 'var(--text-secondary)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
})
const footer = style({
  minWidth: 0,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'calc(12px * var(--layout-spacing))',
})
const meta = style({
  width: 'min(100%, 300px)',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 7,
})
const metaItem = style({
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 28,
  padding: '0 9px',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-caption)',
  background: 'var(--surface-muted)',
  borderRadius: 8,
})
const metaIcon = style({ flexShrink: 0 })
const metaLabel = style({ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })
const actions = style({ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 })
const chevron = style({
  transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
  selectors: { '&[data-expanded="true"]': { transform: 'rotate(180deg)' } },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
})
const diagnosticsPanel = style({
  display: 'grid',
  gridTemplateRows: '0fr',
  minWidth: 0,
  marginTop: 'calc(-16px * var(--layout-spacing))',
  opacity: 0,
  visibility: 'hidden',
  transition:
    'grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1), margin-top 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, visibility 0s linear 260ms',
  selectors: {
    '&[data-expanded="true"]': {
      gridTemplateRows: '1fr',
      marginTop: 0,
      opacity: 1,
      visibility: 'visible',
      transitionDelay: '0s',
    },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
})
const diagnosticsClip = style({ minHeight: 0, overflow: 'hidden' })
const diagnostics = style({
  display: 'grid',
  minWidth: 0,
  gap: 'calc(16px * var(--layout-spacing))',
  paddingTop: 'calc(16px * var(--layout-spacing))',
  paddingInline: 4,
  paddingBottom: 4,
  borderTop: '1px solid var(--border-subtle)',
  transform: 'translateY(-6px)',
  transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
  selectors: { [`${diagnosticsPanel}[data-expanded="true"] &`]: { transform: 'translateY(0)' } },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } },
})
const details = style({
  minWidth: 0,
  margin: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 'calc(12px * var(--layout-spacing)) calc(20px * var(--layout-spacing))',
  '@container': {
    'desktop-overview (max-width: 620px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    'desktop-overview (max-width: 360px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
})
const detail = style({ minWidth: 0 })
const detailLabel = style({ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-caption)', marginBottom: 5 })
const detailValue = style({
  margin: 0,
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
})
const valueSkeleton = style({
  width: 'min(100%, 12ch)',
  display: 'inline-block',
  verticalAlign: 'middle',
  selectors: { '&[aria-hidden="true"]': { minHeight: 0, height: '0.85em', borderRadius: 4 } },
})
const error = style({
  margin: 0,
  padding: '10px 12px',
  color: 'var(--danger-text)',
  background: 'var(--danger-background)',
  borderRadius: 8,
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})

export const styles = {
  card,
  summary,
  identity,
  identityCopy,
  logo,
  name,
  author,
  runtime,
  footer,
  meta,
  metaItem,
  metaIcon,
  metaLabel,
  actions,
  chevron,
  diagnosticsPanel,
  diagnosticsClip,
  diagnostics,
  details,
  detail,
  detailLabel,
  detailValue,
  valueSkeleton,
  error,
}
