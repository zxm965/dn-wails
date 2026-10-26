import { globalFontFace, globalStyle } from '@vanilla-extract/css'

import { FONT_SIZE_PRESETS } from '@/shared/theme/typography'

globalFontFace('Nunito', {
  fontStyle: 'normal',
  fontWeight: '400',
  src: "local(''),\n    url('../../assets/fonts/nunito-v16-latin-regular.woff2') format('woff2')",
})

globalStyle(':root', {
  colorScheme: 'dark',
  vars: {
    '--accent': '#07c160',
    '--accent-hover': '#06ad56',
    '--accent-muted': 'rgba(7, 193, 96, 0.13)',
    '--button-primary-text': '#ffffff',
    '--app-background': '#1b2636',
    '--navigation-background': 'rgba(17, 27, 41, 0.72)',
    '--titlebar-background': 'rgba(17, 27, 41, 0.9)',
    '--surface-elevated': 'rgba(15, 24, 37, 0.9)',
    '--surface-muted': 'rgba(255, 255, 255, 0.065)',
    '--surface-hover': 'rgba(255, 255, 255, 0.1)',
    '--border-subtle': 'rgba(255, 255, 255, 0.08)',
    '--border-strong': 'rgba(255, 255, 255, 0.13)',
    '--text-primary': '#f5f8fb',
    '--text-secondary': 'rgba(245, 248, 251, 0.7)',
    '--text-tertiary': 'rgba(245, 248, 251, 0.48)',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.24)',
    '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.4)',
    '--scrollbar-thumb-active': 'rgba(255, 255, 255, 0.56)',
    '--focus-ring': 'rgba(87, 190, 255, 0.92)',
    '--switch-background': 'rgba(255, 255, 255, 0.18)',
    '--danger-text': '#ff918a',
    '--danger-background': 'rgba(220, 74, 66, 0.12)',
    '--danger-border': 'rgba(255, 117, 107, 0.24)',
    '--surface-shadow': '0 18px 42px rgba(6, 12, 21, 0.18)',
    '--button-height-sm': '28px',
    '--button-height-md': '32px',
    '--button-height-lg': '36px',
    '--button-height-default': 'var(--button-height-md)',
    '--control-height': '42px',
    '--layout-spacing': '1',
    '--page-content-max-width': '1180px',
    '--page-padding-inline': 'calc(clamp(18px, 3vw, 32px) * var(--layout-spacing))',
    '--page-padding-start': 'var(--page-padding-inline)',
    '--page-padding-end': 'var(--page-padding-inline)',
    '--panel-padding': 'calc(clamp(18px, 2.5vw, 24px) * var(--layout-spacing))',
    '--panel-radius': '16px',
  },
})

globalStyle(":root[data-theme='light']", {
  colorScheme: 'light',
  vars: {
    '--app-background': '#f2f5f7',
    '--navigation-background': 'rgba(247, 249, 250, 0.92)',
    '--titlebar-background': 'rgba(250, 251, 252, 0.94)',
    '--surface-elevated': '#ffffff',
    '--surface-muted': '#f2f4f6',
    '--surface-hover': '#e9edf0',
    '--border-subtle': 'rgba(21, 34, 49, 0.08)',
    '--border-strong': 'rgba(21, 34, 49, 0.14)',
    '--text-primary': '#172231',
    '--text-secondary': 'rgba(23, 34, 49, 0.7)',
    '--text-tertiary': 'rgba(23, 34, 49, 0.48)',
    '--scrollbar-thumb': 'rgba(0, 0, 0, 0.24)',
    '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.4)',
    '--scrollbar-thumb-active': 'rgba(0, 0, 0, 0.56)',
    '--switch-background': 'rgba(23, 34, 49, 0.2)',
    '--danger-text': '#b93831',
    '--danger-background': 'rgba(215, 66, 57, 0.08)',
    '--danger-border': 'rgba(190, 56, 49, 0.18)',
    '--surface-shadow': '0 18px 42px rgba(45, 59, 76, 0.09)',
  },
})

globalStyle(":root[data-accent='blue']", {
  vars: {
    '--accent': '#3488ff',
    '--accent-hover': '#2377e8',
    '--accent-muted': 'rgba(52, 136, 255, 0.13)',
  },
})

globalStyle(":root[data-accent='purple']", {
  vars: {
    '--accent': '#8b5cf6',
    '--accent-hover': '#7948e5',
    '--accent-muted': 'rgba(139, 92, 246, 0.14)',
  },
})

globalStyle(":root[data-accent='orange']", {
  vars: {
    '--accent': '#ef8b2c',
    '--accent-hover': '#d97a20',
    '--accent-muted': 'rgba(239, 139, 44, 0.14)',
  },
})

globalStyle(":root[data-density='compact']", {
  vars: {
    '--control-height': '36px',
    '--layout-spacing': '0.75',
  },
})

globalStyle(":root[data-button-size='sm']", {
  vars: {
    '--button-height-default': 'var(--button-height-sm)',
  },
})

globalStyle(":root[data-button-size='md']", {
  vars: {
    '--button-height-default': 'var(--button-height-md)',
  },
})

globalStyle(":root[data-button-size='lg']", {
  vars: {
    '--button-height-default': 'var(--button-height-lg)',
  },
})

globalStyle('*', {
  boxSizing: 'border-box',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--scrollbar-thumb) transparent',
  '@supports': {
    // Standard scrollbar properties override the WebKit pseudo-elements when non-auto.
    'selector(::-webkit-scrollbar)': {
      scrollbarWidth: 'auto',
      scrollbarColor: 'auto',
    },
  },
  '@media': {
    '(forced-colors: active)': { scrollbarWidth: 'auto', scrollbarColor: 'auto' },
  },
})

globalStyle('::-webkit-scrollbar', {
  width: '10px',
  height: '10px',
})

globalStyle('::-webkit-scrollbar-track, ::-webkit-scrollbar-corner', {
  background: 'transparent',
})

globalStyle('::-webkit-scrollbar-thumb', {
  minWidth: '32px',
  minHeight: '32px',
  border: '3px solid transparent',
  borderRadius: '999px',
  backgroundColor: 'var(--scrollbar-thumb)',
  backgroundClip: 'padding-box',
  '@media': {
    '(forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
})

globalStyle('::-webkit-scrollbar-thumb:hover', {
  borderWidth: '2px',
  backgroundColor: 'var(--scrollbar-thumb-hover)',
  '@media': {
    '(forced-colors: active)': { backgroundColor: 'Highlight' },
  },
})

globalStyle('::-webkit-scrollbar-thumb:active', {
  borderWidth: '2px',
  backgroundColor: 'var(--scrollbar-thumb-active)',
  '@media': {
    '(forced-colors: active)': { backgroundColor: 'Highlight' },
  },
})

globalStyle('::-webkit-scrollbar-button', {
  display: 'none',
  width: 0,
  height: 0,
})

globalStyle('html,\nbody,\n#root', {
  height: '100%',
  isolation: 'isolate',
})

globalStyle('html', {
  color: 'var(--text-primary)',
  background: 'var(--app-background)',
  fontSize: 'var(--font-size-body)',
})

globalStyle('body', {
  minWidth: '0',
  overflow: 'hidden',
  margin: '0',
  color: 'var(--text-primary)',
  fontFamily:
    "'Nunito',\n    -apple-system,\n    BlinkMacSystemFont,\n    'Segoe UI',\n    'Roboto',\n    'Oxygen',\n    'Ubuntu',\n    'Cantarell',\n    'Fira Sans',\n    'Droid Sans',\n    'Helvetica Neue',\n    sans-serif",
  background: 'var(--app-background)',
})

globalStyle('img,\nsvg,\nvideo,\ncanvas', {
  maxWidth: '100%',
})

globalStyle('button,\ninput,\nselect,\ntextarea', {
  font: 'inherit',
})

globalStyle('button,\ninput,\nselect,\ntextarea', {
  outlineColor: 'var(--focus-ring)',
})

globalStyle('::selection', {
  color: 'var(--button-primary-text)',
  background: 'var(--accent)',
})

globalStyle(':root', {
  '@media': {
    '(max-width: 640px)': {
      vars: {
        '--page-padding-inline': 'calc(16px * var(--layout-spacing))',
        '--panel-padding': 'calc(16px * var(--layout-spacing))',
        '--panel-radius': '13px',
      },
    },
  },
})

for (const [preset, { sizes }] of Object.entries(FONT_SIZE_PRESETS)) {
  globalStyle(preset === 'md' ? ':root' : `:root[data-font-size='${preset}']`, {
    vars: Object.fromEntries(Object.entries(sizes).map(([role, size]) => [`--font-size-${role}`, `${size}px`])),
  })
}
