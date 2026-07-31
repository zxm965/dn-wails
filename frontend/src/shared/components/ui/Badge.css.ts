import { style } from '@vanilla-extract/css'

const uiBadge = style({
  minHeight: '22px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 8px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  fontWeight: '800',
  lineHeight: '1.2',
  whiteSpace: 'nowrap',
  background: 'var(--surface-muted)',
  border: '1px solid transparent',
  borderRadius: '999px',
})

const uiBadgeAccent = style({
  color: 'var(--accent)',
  background: 'var(--accent-muted)',
})

const uiBadgeOutline = style({
  background: 'transparent',
  borderColor: 'var(--border-strong)',
})

const uiBadgeSuccess = style({
  color: '#26c876',
  background: 'rgba(24, 183, 104, 0.12)',
})

const uiBadgeWarning = style({
  color: '#e7a72f',
  background: 'rgba(231, 167, 47, 0.12)',
})

const uiBadgeDanger = style({
  color: 'var(--danger-text)',
  background: 'var(--danger-background)',
})

const uiBadgeInfo = style({
  color: '#57beff',
  background: 'rgba(87, 190, 255, 0.12)',
})

export const classes = {
  'ui-badge': uiBadge,
  'ui-badge-accent': uiBadgeAccent,
  'ui-badge-outline': uiBadgeOutline,
  'ui-badge-success': uiBadgeSuccess,
  'ui-badge-warning': uiBadgeWarning,
  'ui-badge-danger': uiBadgeDanger,
  'ui-badge-info': uiBadgeInfo,
} as const
