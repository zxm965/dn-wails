import { globalStyle, style } from '@vanilla-extract/css'

const uiSelectTrigger = style({
  width: '100%',
  minWidth: '0',
  height: 'var(--control-height)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '0 10px 0 11px',
  color: 'var(--text-primary)',
  textAlign: 'left',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '9px',
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
  ':focus-visible': {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-muted)',
  },
  selectors: {
    '&[data-popup-open]': {
      borderColor: 'var(--accent)',
      boxShadow: '0 0 0 3px var(--accent-muted)',
    },
    '&[data-disabled]': {
      cursor: 'not-allowed',
      opacity: '0.55',
    },
    '&[data-placeholder]': {
      color: 'var(--text-tertiary)',
    },
  },
})

const uiSelectValue = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const uiSelectIcon = style([
  {
    width: '18px',
    height: '18px',
    flex: '0 0 auto',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--text-tertiary)',
    transition: 'color 140ms ease, transform 140ms ease',
    selectors: {
      [`${uiSelectTrigger}[data-popup-open] &`]: {
        color: 'var(--accent)',
        transform: 'rotate(180deg)',
      },
    },
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
])

const uiSelectPositioner = style({
  zIndex: '1200',
  width: 'var(--anchor-width)',
  maxWidth: 'calc(100vw - 20px)',
  outline: 'none',
})

const uiSelectPopup = style([
  {
    width: '100%',
    maxHeight: 'min(var(--available-height), 320px)',
    overflow: 'hidden',
    padding: '5px',
    color: 'var(--text-primary)',
    background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--accent) 4%)',
    border: '1px solid var(--border-strong)',
    borderRadius: '11px',
    transformOrigin: 'var(--transform-origin)',
    transition: 'opacity 120ms ease, transform 120ms ease',
    boxShadow: '0 18px 44px rgba(6, 12, 21, 0.24)',
    backdropFilter: 'blur(18px)',
    selectors: {
      '&[data-starting-style], &[data-ending-style]': {
        opacity: '0',
        transform: 'translateY(-4px) scale(0.985)',
      },
    },
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
])

const uiSelectList = style({
  maxHeight: 'min(calc(var(--available-height) - 12px), 300px)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'thin',
})

const uiSelectItem = style({
  minHeight: '34px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '7px 9px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.35',
  borderRadius: '7px',
  outline: 'none',
  cursor: 'pointer',
  userSelect: 'none',
  selectors: {
    '&[data-highlighted]': {
      color: 'var(--text-primary)',
      background: 'var(--surface-hover)',
    },
    '&[data-selected]': {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
    },
    '&[data-selected][data-highlighted]': {
      background: 'color-mix(in srgb, var(--accent-muted) 78%, var(--surface-hover))',
    },
    '&[data-disabled]': {
      cursor: 'not-allowed',
      opacity: '0.45',
    },
  },
})

const uiSelectItemText = style({
  minWidth: '0',
  flex: '1',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const uiSelectItemIndicator = style({
  width: '16px',
  height: '16px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
})

const uiSelectScrollArrow = style({
  height: '22px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-tertiary)',
  background: 'var(--surface-elevated)',
})

export const styles = {
  'ui-select-trigger': uiSelectTrigger,
  'ui-select-value': uiSelectValue,
  'ui-select-icon': uiSelectIcon,
  'ui-select-positioner': uiSelectPositioner,
  'ui-select-popup': uiSelectPopup,
  'ui-select-list': uiSelectList,
  'ui-select-item': uiSelectItem,
  'ui-select-item-text': uiSelectItemText,
  'ui-select-item-indicator': uiSelectItemIndicator,
  'ui-select-scroll-arrow': uiSelectScrollArrow,
} as const

globalStyle(`${uiSelectIcon} svg`, {
  width: '15px',
  height: '15px',
})

globalStyle(`${uiSelectItemIndicator} svg`, {
  width: '13px',
  height: '13px',
  strokeWidth: '2.2',
})

globalStyle(`${uiSelectScrollArrow} svg`, {
  width: '14px',
  height: '14px',
})
