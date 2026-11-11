import { keyframes, style } from '@vanilla-extract/css'

export const tabActionsWidthVar = '--page-tab-actions-width'

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
  gap: '5px',
  padding: '5px',
  background: 'color-mix(in srgb, var(--surface-elevated) 90%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
  boxShadow: '0 12px 30px rgba(6, 12, 21, 0.12)',
  backdropFilter: 'blur(18px)',
})

const tab = style({
  position: 'relative',
  minWidth: 'max-content',
  flex: '1 0 0',
  display: 'flex',
  alignItems: 'center',
  border: '1px solid transparent',
  borderRadius: '8px',
  selectors: {
    '&:not([data-active]):hover': {
      background: 'var(--surface-hover)',
    },
    '&[data-active]': {
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 35%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
  },
})

const trigger = style({
  minWidth: '0',
  flex: '1 1 auto',
  justifyContent: 'flex-start',
  gap: '10px',
  padding: '0 12px',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  background: 'transparent',
  border: 0,
  borderRadius: '7px',
  selectors: {
    [`${tab}:not([data-active]) &`]: {
      position: 'static',
      overflow: 'visible',
    },
    [`${tab}:not([data-active]) &::after`]: {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: '8px',
    },
    '&:hover:not(:disabled)': {
      background: 'transparent',
    },
    '&:active:not(:disabled)': {
      transform: 'none',
    },
    '&[data-active], &[data-active]:hover': {
      color: 'var(--text-primary)',
      background: 'transparent',
      boxShadow: 'none',
    },
  },
  '@container': {
    'page-tabs (max-width: 360px)': {
      gap: '6px',
      padding: '0 8px',
    },
  },
})

const tabActions = style({
  width: `var(${tabActionsWidthVar}, auto)`,
  flex: '0 0 auto',
  minWidth: 0,
  minHeight: 'max(var(--button-height-md), var(--button-height-default))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  paddingRight: 4,
  visibility: 'hidden',
  selectors: {
    '&[data-active]': { visibility: 'visible' },
  },
})

const index = style({
  flex: '0 0 auto',
  color: 'var(--accent)',
  fontSize: 'var(--font-size-caption)',
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
  fontSize: 'var(--font-size-secondary)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const description = style({
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '@container': {
    'page-tabs (max-width: 1050px)': { display: 'none' },
  },
})

const enter = keyframes({
  from: { opacity: 0.65, transform: 'translateY(4px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
})

const content = style({
  animation: `${enter} 180ms ease-out`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
  minWidth: '0',
  display: 'grid',
  gap: 'calc(16px * var(--layout-spacing))',
  selectors: {
    '&[hidden]': { display: 'none' },
  },
})

const toolbar = style([
  list,
  { alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', overflowX: 'visible' },
])
const actionList = style({
  display: 'flex',
  gap: 5,
  flex: '1 1 180px',
  minWidth: 0,
  width: 'auto',
  padding: 0,
  border: 0,
  borderRadius: 0,
  background: 'transparent',
  overflowX: 'auto',
})
const actions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginLeft: 'auto',
  padding: '0 5px',
  minHeight: 32,
})
export const styles = {
  root,
  list,
  tab,
  tabActions,
  trigger,
  index,
  copy,
  label,
  description,
  content,
  toolbar,
  actionList,
  actions,
}
