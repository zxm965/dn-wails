import { style } from '@vanilla-extract/css'

const root = style({
  minWidth: '0',
  containerName: 'page-tabs',
  containerType: 'inline-size',
})

const list = style({
  position: 'sticky',
  top: '12px',
  zIndex: '20',
  width: '100%',
  minWidth: '0',
  display: 'flex',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  scrollbarWidth: 'thin',
  gap: '5px',
  padding: '5px',
  background: 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(6, 12, 21, 0.12)',
  backdropFilter: 'blur(18px)',
})

const trigger = style({
  minWidth: '0',
  flex: '1 0 auto',
  justifyContent: 'flex-start',
  gap: '10px',
  padding: '0 12px',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '8px',
  selectors: {
    '&[data-active], &[data-active]:hover': {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
  },
  '@container': {
    'page-tabs (max-width: 360px)': {
      gap: '6px',
      padding: '0 8px',
    },
  },
})

const index = style({
  flex: '0 0 auto',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.08em',
  '@container': {
    'page-tabs (max-width: 360px)': { display: 'none' },
  },
})

const copy = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
})

const label = style({
  overflow: 'hidden',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const description = style({
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '@container': {
    'page-tabs (max-width: 1050px)': { display: 'none' },
  },
})

const content = style({
  minWidth: '0',
  display: 'grid',
  gap: '16px',
  selectors: {
    '&[hidden]': { display: 'none' },
  },
})

export const styles = { root, list, trigger, index, copy, label, description, content }
