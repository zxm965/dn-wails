import { keyframes, style } from '@vanilla-extract/css'

const breathe = keyframes({ '0%, 100%': { opacity: 0.55 }, '50%': { opacity: 0.85 } })

// A quiet solid fill replaces the full-width moving gradient only in list placeholders.
const shape = style({
  selectors: {
    '&[aria-hidden="true"]': {
      minHeight: 0,
      minWidth: 0,
      maxWidth: '100%',
      background: 'var(--border-subtle)',
      animation: 'none',
      borderRadius: '4px',
    },
  },
})
const line = style([
  shape,
  {
    height: '10px',
    width: '58%',
    selectors: {
      '&[data-width="short"]': { width: '32%' },
      '&[data-width="long"]': { width: '82%' },
    },
  },
])
const copy = style({ minWidth: 0, display: 'grid', gap: '12px', flex: 1 })
const identity = style({ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 })
const actions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  minHeight: '24px',
})

export const styles = {
  error: style({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    color: 'var(--text-secondary)',
    overflowWrap: 'anywhere',
  }),
  refresh: style({ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-secondary)', paddingBottom: '8px' }),
  loading: style({ containerType: 'inline-size', containerName: 'query-feedback', minWidth: 0 }),
  content: style({
    animation: `${breathe} 2.6s ease-in-out infinite`,
    '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.7 } },
  }),
  line,
  copy,
  identity,
  actions,
  icon: style([shape, { width: '32px', height: '32px', flexShrink: 0 }]),
  badge: style([shape, { width: '42px', height: '18px', flexShrink: 0 }]),
  control: style([shape, { width: '28px', height: '28px', flexShrink: 0 }]),
  table: style({ display: 'grid' }),
  tableRow: style({
    display: 'grid',
    gridTemplateColumns: '0.45fr 1.4fr 1fr 0.7fr 0.8fr 1.4fr 1fr',
    alignItems: 'center',
    gap: 'calc(16px * var(--layout-spacing))',
    padding: 'calc(20px * var(--layout-spacing)) 12px',
    selectors: { '& + &': { borderTop: '1px solid var(--border-subtle)' } },
    '@container': { 'query-feedback (max-width: 600px)': { gridTemplateColumns: '0.5fr 1.4fr 1fr', gap: '12px' } },
  }),
  cell: style({
    minWidth: 0,
    '@container': {
      'query-feedback (max-width: 600px)': { selectors: { '&[data-secondary="true"]': { display: 'none' } } },
    },
  }),
  cards: style({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 360px))',
    gap: 'calc(14px * var(--layout-spacing))',
  }),
  card: style({
    minWidth: 0,
    display: 'grid',
    gap: 'calc(20px * var(--layout-spacing))',
    padding: 'calc(16px * var(--layout-spacing))',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
  }),
  section: style({
    minWidth: 0,
    display: 'grid',
    gap: '16px',
    padding: 'calc(13px * var(--layout-spacing))',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
  }),
  list: style({ display: 'grid', gap: 'calc(12px * var(--layout-spacing))' }),
  message: style({
    minWidth: 0,
    display: 'grid',
    gap: '12px',
    padding: 'calc(16px * var(--layout-spacing))',
    border: '1px solid var(--border-subtle)',
    borderRadius: '11px',
  }),
  excerpt: style({ minWidth: 0, paddingLeft: '44px' }),
}
