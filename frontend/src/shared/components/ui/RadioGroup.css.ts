import { style } from '@vanilla-extract/css'

const uiRadioGroup = style({
  minWidth: '0',
  selectors: {
    '&[data-variant="segmented"]': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
      padding: '3px',
      background: 'var(--surface-muted)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '10px',
    },
    '&[data-variant="chips"]': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    },
  },
})

const uiRadioControl = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  opacity: '0',
  pointerEvents: 'none',
})

const uiRadioItem = style({
  position: 'relative',
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'color 140ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
  selectors: {
    [`${uiRadioGroup}[data-variant="segmented"] &`]: {
      minHeight: 'var(--control-height)',
      padding: '0 10px',
      borderRadius: '7px',
    },
    [`${uiRadioGroup}[data-variant="chips"] &`]: {
      minHeight: '36px',
      justifyContent: 'flex-start',
      padding: '0 11px',
      background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '9px',
    },
    [`${uiRadioGroup}[data-variant="segmented"] &:has(${uiRadioControl}[data-checked])`]: {
      color: 'var(--text-primary)',
      background: 'var(--surface-elevated)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    },
    [`${uiRadioGroup}[data-variant="chips"] &:has(${uiRadioControl}[data-checked])`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 42%, var(--border-strong))',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent)',
    },
    '&:has(input:focus-visible)': {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '2px',
    },
    [`&:has(${uiRadioControl}[data-disabled])`]: {
      cursor: 'not-allowed',
      opacity: '0.5',
    },
  },
})

const uiRadioLeading = style({
  width: '22px',
  height: '22px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
})

const uiRadioLabel = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

export const styles = {
  'ui-radio-group': uiRadioGroup,
  'ui-radio-item': uiRadioItem,
  'ui-radio-control': uiRadioControl,
  'ui-radio-leading': uiRadioLeading,
  'ui-radio-label': uiRadioLabel,
} as const
