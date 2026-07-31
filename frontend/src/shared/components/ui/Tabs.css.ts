import { globalStyle, style } from '@vanilla-extract/css'

const uiTabs = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
})

const uiTabsList = style({
  width: 'fit-content',
  display: 'flex',
  gap: '4px',
  padding: '3px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
})

const uiTabsTrigger = style({
  minHeight: 'var(--button-height-md)',
  padding: '0 12px',
  color: 'var(--text-secondary)',
  font: 'inherit',
  fontSize: '12px',
  fontWeight: '750',
  background: 'transparent',
  border: '0',
  borderRadius: '7px',
  cursor: 'pointer',
})

const uiTabsContent = style({
  minWidth: '0',
  outline: 'none',
})

export const classes = {
  'ui-tabs': uiTabs,
  'ui-tabs-list': uiTabsList,
  'ui-tabs-trigger': uiTabsTrigger,
  'ui-tabs-content': uiTabsContent,
} as const

globalStyle(`${uiTabsTrigger}[data-active]`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-elevated)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
})

globalStyle(`${uiTabsTrigger}:focus-visible`, {
  outline: '2px solid var(--focus-ring)',
  outlineOffset: '2px',
})
