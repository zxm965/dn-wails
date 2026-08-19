import { globalStyle, style } from '@vanilla-extract/css'

import { styles as buttonStyles } from './Button.css'

const uiDialogBackdrop = style([
  {
    position: 'fixed',
    inset: '0',
    zIndex: '1100',
    background: 'rgba(4, 9, 15, 0.62)',
    backdropFilter: 'blur(8px)',
    transition: 'opacity 140ms ease',
    selectors: {
      '&[data-starting-style], &[data-ending-style]': {
        opacity: '0',
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

const uiDialogViewport = style([
  {
    position: 'fixed',
    inset: '0',
    zIndex: '1101',
    display: 'grid',
    placeItems: 'center',
    overflow: 'auto',
    padding: '24px',
    selectors: {
      "&[data-size='full']": {
        padding: '0',
      },
    },
  },
  {
    '@media': {
      '(max-width: 560px)': {
        alignItems: 'end',
        padding: '10px',
      },
    },
  },
])

const uiDialog = style([
  {
    position: 'relative',
    width: 'min(100%, 620px)',
    maxHeight: 'min(86vh, 820px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: 'var(--text-primary)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: '16px',
    boxShadow: '0 28px 80px rgba(0, 0, 0, 0.34)',
    outline: 'none',
    transition: 'opacity 160ms ease,\n    transform 160ms ease',
    selectors: {
      "&[data-size='sm']": {
        width: 'min(100%, 430px)',
      },
      "&[data-size='lg']": {
        width: 'min(100%, 880px)',
      },
      "&[data-size='full']": {
        width: '100%',
        height: '100%',
        maxHeight: 'none',
        borderRadius: '0',
      },
      '&[data-starting-style], &[data-ending-style]': {
        opacity: '0',
        transform: 'translateY(10px) scale(0.985)',
      },
    },
  },
  {
    '@media': {
      '(max-width: 560px)': {
        width: '100%',
        maxHeight: '92vh',
        borderRadius: '16px 16px 10px 10px',
        selectors: {
          "&[data-size='full']": {
            height: '100%',
            maxHeight: 'none',
            borderRadius: '0',
          },
        },
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

const uiDialogHeader = style({
  minWidth: '0',
  padding: '20px 52px 16px 22px',
  borderBottom: '1px solid var(--border-subtle)',
})

const uiDialogTitle = style({
  margin: '0',
  fontSize: '16px',
})

const uiDialogDescription = style({
  margin: '6px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.55',
})

const uiDialogBody = style({
  minHeight: '0',
  flex: '1',
  overflowY: 'auto',
  padding: '20px 22px',
  overscrollBehavior: 'contain',
})

const uiDialogFooter = style([
  {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 22px',
    background: 'var(--surface-muted)',
    borderTop: '1px solid var(--border-subtle)',
  },
  {
    '@media': {
      '(max-width: 560px)': {
        flexDirection: 'column-reverse',
      },
    },
  },
])

const uiDialogClose = style({
  position: 'absolute',
  top: '13px',
  right: '13px',
  zIndex: '2',
  width: 'var(--button-height-sm)',
  padding: '0',
})

export const styles = {
  'ui-dialog-backdrop': uiDialogBackdrop,
  'ui-dialog-viewport': uiDialogViewport,
  'ui-dialog': uiDialog,
  'ui-dialog-header': uiDialogHeader,
  'ui-dialog-title': uiDialogTitle,
  'ui-dialog-description': uiDialogDescription,
  'ui-dialog-body': uiDialogBody,
  'ui-dialog-footer': uiDialogFooter,
  'ui-dialog-close': uiDialogClose,
} as const

globalStyle(`${uiDialog} > form`, {
  minHeight: '0',
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
})

globalStyle(`${uiDialogFooter} ${buttonStyles.root}`, {
  '@media': {
    '(max-width: 560px)': {
      width: '100%',
    },
  },
})
