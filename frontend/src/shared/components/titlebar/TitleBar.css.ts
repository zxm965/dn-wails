import { globalStyle, style } from '@vanilla-extract/css'

const disableImageDrag = { WebkitUserDrag: 'none' } as const

const disableWindowDrag = { WebkitAppRegion: 'no-drag' } as const

const titlebarMacos = style({
  position: 'relative',
  paddingRight: '8px',
  paddingLeft: '82px',
})

const titlebar = style({
  flex: '0 0 44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingLeft: '14px',
  background: 'var(--titlebar-background)',
  borderBottom: '1px solid var(--border-subtle)',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  vars: {
    '--wails-draggable': 'drag',
  },
  selectors: {
    [`&${titlebarMacos}`]: {
      flexBasis: '32px',
    },
    [`&:not(${titlebarMacos})`]: {
      '@media': {
        '(max-width: 480px)': {
          paddingLeft: '10px',
        },
      },
    },
  },
})

const titlebarBrand = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  selectors: {
    [`${titlebarMacos} &`]: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 'min(60%, 620px)',
      justifyContent: 'center',
      transform: 'translate(-50%, -50%)',
    },
  },
})

const titlebarActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginLeft: 'auto',
  ...disableWindowDrag,
  vars: {
    '--wails-draggable': 'no-drag',
  },
})

const titlebarActionsWindowControls = style({
  height: '28px',
  marginRight: '5px',
  paddingRight: '9px',
  borderRight: '1px solid var(--border-subtle)',
})

const titlebarLogo = style([
  {
    width: '15px',
    height: '15px',
    objectFit: 'contain',
  },
  {
    '@media': {
      '(max-width: 480px)': {
        width: '14px',
        height: '14px',
      },
    },
  },
])

const titlebarTitle = style({
  overflow: 'hidden',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: '600',
  lineHeight: '1',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const windowControls = style({
  alignSelf: 'center',
  height: 'var(--button-height-lg)',
  display: 'flex',
  vars: {
    '--wails-draggable': 'no-drag',
  },
})

const windowControl = style([
  {
    width: '46px',
    height: 'var(--button-height-lg)',
    display: 'grid',
    placeItems: 'center',
    padding: '0',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '0',
    borderRadius: '0',
    cursor: 'default',
    ':hover': {
      color: 'var(--text-primary)',
      background: 'var(--surface-hover)',
    },
    ':focus-visible': {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '-2px',
    },
  },
  {
    '@media': {
      '(max-width: 640px)': {
        width: '42px',
      },
    },
  },
  {
    '@media': {
      '(max-width: 480px)': {
        width: '38px',
      },
    },
  },
])

const windowControlClose = style({
  selectors: {
    '&[data-button-variant="ghost"]:hover:not(:disabled)': {
      color: '#ffffff',
      background: '#c42b1c',
    },
  },
})

export const styles = {
  titlebar: titlebar,
  'titlebar-brand': titlebarBrand,
  'titlebar-actions': titlebarActions,
  'titlebar-actions-window-controls': titlebarActionsWindowControls,
  'titlebar-macos': titlebarMacos,
  'titlebar-logo': titlebarLogo,
  'titlebar-title': titlebarTitle,
  'window-controls': windowControls,
  'window-control': windowControl,
  'window-control-close': windowControlClose,
} as const

globalStyle(`${titlebar} *`, {
  WebkitUserSelect: 'none',
  userSelect: 'none',
})

globalStyle(
  `${titlebar} img,
${titlebar} svg`,
  disableImageDrag as never,
)

globalStyle(`${windowControl} svg`, {
  width: '12px',
  height: '12px',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeWidth: '1.2',
})
