import { style } from '@vanilla-extract/css'

const root = style({ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' })
const viewport = style({
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  scrollbarWidth: 'none',
  scrollbarGutter: 'auto',
  overscrollBehavior: 'contain',
  selectors: { '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 } },
  ':focus-visible': { outline: '2px solid var(--focus-ring)', outlineOffset: -2 },
})
const content = style({ minHeight: '100%', display: 'flow-root' })
const scrollbar = style({
  position: 'absolute',
  top: 2,
  right: 1,
  bottom: 2,
  zIndex: 30,
  width: 10,
  padding: '0 3px',
  borderRadius: 999,
  userSelect: 'none',
  touchAction: 'none',
  opacity: 0,
  transition: 'opacity 160ms ease',
  selectors: {
    '&[data-hovering], &[data-scrolling], &:hover, &:active': { opacity: 1 },
    [`${root}:focus-within &`]: { opacity: 1 },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
})
const thumb = style({
  width: '100%',
  minHeight: 32,
  borderRadius: 999,
  background: 'var(--scrollbar-thumb)',
  selectors: {
    [`${scrollbar}:hover &`]: { background: 'var(--scrollbar-thumb-hover)' },
    '&:active': { background: 'var(--scrollbar-thumb-active)' },
  },
  '@media': { '(forced-colors: active)': { background: 'CanvasText', forcedColorAdjust: 'none' } },
})

export const styles = { root, viewport, content, scrollbar, thumb }
