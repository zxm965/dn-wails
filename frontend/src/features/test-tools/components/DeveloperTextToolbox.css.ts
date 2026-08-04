import { globalStyle, style } from '@vanilla-extract/css'

const textToolbox = style([
  {
    minWidth: '0',
    display: 'grid',
    gridTemplateColumns: '220px minmax(0, 1fr)',
    overflow: 'hidden',
    background:
      'radial-gradient(circle at 4% 0%, var(--accent-muted), transparent 25%), linear-gradient(145deg, var(--surface-elevated), color-mix(in srgb, var(--surface-elevated) 96%, var(--accent) 4%))',
    border: '1px solid color-mix(in srgb, var(--accent) 14%, var(--border-subtle))',
    borderRadius: 'calc(var(--panel-radius) + 2px)',
    boxShadow: 'var(--surface-shadow)',
    containerName: 'text-toolbox',
    containerType: 'inline-size',
  },
  {
    '@container': {
      'test-tools-view (max-width: 780px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const textToolboxSidebar = style([
  {
    minWidth: '0',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    background:
      'linear-gradient(180deg, color-mix(in srgb, var(--surface-muted) 86%, var(--accent) 14%), color-mix(in srgb, var(--surface-muted) 68%, transparent))',
    borderRight: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'text-toolbox (max-width: 780px)': {
        borderRight: '0',
        borderBottom: '1px solid var(--border-subtle)',
      },
    },
  },
])

const textToolboxBrand = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '2px 5px 15px',
  borderBottom: '1px solid var(--border-subtle)',
})

const textToolboxMenu = style([
  {
    display: 'grid',
    gap: '5px',
    marginTop: '12px',
  },
  {
    '@container': {
      'text-toolbox (max-width: 780px)': {
        gridTemplateColumns: 'repeat(4, minmax(112px, 1fr))',
        overflowX: 'auto',
        paddingBottom: '3px',
        scrollbarWidth: 'thin',
      },
    },
  },
])

const isActive = style({
  selectors: {
    [`${textToolboxMenu} button&`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 34%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 2px 0 0 var(--accent)',
    },
    [`${textToolboxMenu} button&[data-button-variant='ghost']:hover`]: {
      color: 'var(--text-primary)',
      background:
        'linear-gradient(135deg, var(--accent-muted), color-mix(in srgb, var(--accent-muted) 34%, transparent))',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-subtle))',
      boxShadow: 'inset 2px 0 0 var(--accent)',
    },
  },
})

const textToolboxMenuIcon = style({
  width: '21px',
  height: '21px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 72%, transparent)',
  borderRadius: '6px',
})

const textToolboxMenuCopy = style({
  minWidth: '0',
  flex: '1',
  overflow: 'hidden',
})

const textToolboxMenuIndex = style({
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  fontWeight: '900',
  fontVariantNumeric: 'tabular-nums',
})

const textToolboxPrivacy = style([
  {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    marginTop: 'auto',
    padding: '14px 5px 2px',
    color: 'var(--text-tertiary)',
    fontSize: '8px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  {
    '@container': {
      'text-toolbox (max-width: 780px)': {
        display: 'none',
      },
    },
  },
])

const textToolboxWorkspace = style({
  minWidth: '0',
  padding: 'clamp(18px, 2.8vw, 26px)',
  containerName: 'text-tools-view',
  containerType: 'inline-size',
})

const textToolboxHeading = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '16px',
    paddingBottom: '15px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'text-tools-view (max-width: 620px)': {
        flexDirection: 'column',
      },
    },
  },
])

const textToolboxFeedback = style({
  minHeight: '30px',
  flex: '0 1 auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '0 11px',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
})

const textToolboxOperations = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    marginBottom: '13px',
    padding: '11px 12px',
    background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '11px',
  },
  {
    '@container': {
      'text-tools-view (max-width: 620px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const textToolboxHashSelect = style({
  width: '130px',
  flex: '0 0 auto',
})

const textToolboxError = style({
  margin: '0 0 13px',
  padding: '10px 12px',
  color: 'var(--danger-text)',
  fontSize: '10px',
  lineHeight: '1.5',
  background: 'var(--danger-background)',
  border: '1px solid var(--danger-border)',
  borderRadius: '9px',
})

const textToolboxEditors = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  {
    '@container': {
      'text-tools-view (max-width: 760px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const textToolboxEditor = style({
  minWidth: '0',
  overflow: 'hidden',
  background: 'color-mix(in srgb, var(--surface-muted) 70%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '11px',
})

const textToolboxFooter = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '13px',
})

export const styles = {
  'text-toolbox': textToolbox,
  'text-toolbox-sidebar': textToolboxSidebar,
  'text-toolbox-brand': textToolboxBrand,
  'text-toolbox-menu': textToolboxMenu,
  'is-active': isActive,
  'text-toolbox-menu-icon': textToolboxMenuIcon,
  'text-toolbox-menu-copy': textToolboxMenuCopy,
  'text-toolbox-menu-index': textToolboxMenuIndex,
  'text-toolbox-privacy': textToolboxPrivacy,
  'text-toolbox-workspace': textToolboxWorkspace,
  'text-toolbox-heading': textToolboxHeading,
  'text-toolbox-feedback': textToolboxFeedback,
  'text-toolbox-operations': textToolboxOperations,
  'text-toolbox-hash-select': textToolboxHashSelect,
  'text-toolbox-error': textToolboxError,
  'text-toolbox-editors': textToolboxEditors,
  'text-toolbox-editor': textToolboxEditor,
  'text-toolbox-footer': textToolboxFooter,
} as const

globalStyle(`${textToolboxBrand} > span`, {
  width: '31px',
  height: '31px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'var(--accent-muted)',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
  borderRadius: '9px',
})

globalStyle(`${textToolboxBrand} svg`, {
  width: '16px',
  height: '16px',
})

globalStyle(`${textToolboxBrand} small`, {
  display: 'block',
  color: 'var(--text-tertiary)',
  fontSize: '7px',
  fontWeight: '900',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
})

globalStyle(`${textToolboxBrand} strong`, {
  display: 'block',
  marginTop: '3px',
  fontSize: '12px',
})

globalStyle(`${textToolboxMenu} button`, {
  width: '100%',
  minWidth: '0',
  justifyContent: 'flex-start',
  gap: '9px',
  padding: '0 9px',
  color: 'var(--text-secondary)',
  border: '1px solid transparent',
  borderRadius: '8px',
})

globalStyle(`${textToolboxMenu} button:hover`, {
  color: 'var(--text-primary)',
  background: 'var(--surface-hover)',
})

globalStyle(`${textToolboxMenuIcon} svg`, {
  width: '12px',
  height: '12px',
})

globalStyle(`${textToolboxMenuCopy} strong`, {
  overflow: 'hidden',
  display: 'block',
  fontSize: '10px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${textToolboxPrivacy} svg`, {
  width: '12px',
  height: '12px',
  color: 'var(--accent)',
})

globalStyle(`${textToolboxHeading} > div`, {
  minWidth: '0',
})

globalStyle(`${textToolboxHeading} > div > span`, {
  display: 'block',
  marginBottom: '5px',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '900',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${textToolboxHeading} h2`, {
  margin: '0',
  fontSize: '18px',
})

globalStyle(`${textToolboxHeading} p`, {
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

globalStyle(`${textToolboxFeedback} > span`, {
  width: '6px',
  height: '6px',
  flex: '0 0 auto',
  background: 'var(--accent)',
  borderRadius: '50%',
  boxShadow: '0 0 0 4px var(--accent-muted)',
})

globalStyle(`${textToolboxOperations} > div`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '8px',
})

globalStyle(`${textToolboxOperations} > small`, {
  maxWidth: '390px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  lineHeight: '1.45',
})

globalStyle(`${textToolboxEditor} > header`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '9px 11px',
  background: 'color-mix(in srgb, var(--surface-elevated) 76%, transparent)',
  borderBottom: '1px solid var(--border-subtle)',
})

globalStyle(`${textToolboxEditor} > header span`, {
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  fontVariantNumeric: 'tabular-nums',
})

globalStyle(`${textToolboxEditor} textarea`, {
  minHeight: '360px',
  display: 'block',
  padding: '14px',
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: '11px',
  lineHeight: '1.65',
  background: 'transparent',
  border: '0',
  borderRadius: '0',
  resize: 'vertical',
})

globalStyle(`${textToolboxEditor} textarea:focus`, {
  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 42%, transparent)',
})

globalStyle(`${textToolboxFooter} button`, {
  flex: '0 0 auto',
})
