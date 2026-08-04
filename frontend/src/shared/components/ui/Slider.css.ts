import { style } from '@vanilla-extract/css'

const uiSlider = style({
  width: '100%',
  minWidth: '0',
})

const uiSliderControl = style({
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  touchAction: 'none',
  cursor: 'pointer',
  selectors: {
    [`${uiSlider}[data-disabled] &`]: {
      cursor: 'not-allowed',
      opacity: '0.5',
    },
  },
})

const uiSliderTrack = style({
  position: 'relative',
  width: '100%',
  height: '6px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
})

const uiSliderIndicator = style({
  background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #ffffff))',
  borderRadius: 'inherit',
})

const uiSliderThumb = style({
  width: '18px',
  height: '18px',
  background: 'var(--surface-elevated)',
  border: '2px solid var(--accent)',
  borderRadius: '50%',
  outline: 'none',
  boxShadow: '0 3px 9px rgba(6, 12, 21, 0.2)',
  transition: 'box-shadow 140ms ease, transform 140ms ease',
  selectors: {
    '&:hover': {
      transform: 'scale(1.08)',
    },
    '&:has(input:focus-visible)': {
      boxShadow: '0 0 0 4px var(--accent-muted), 0 3px 9px rgba(6, 12, 21, 0.2)',
    },
    [`${uiSlider}[data-dragging] &`]: {
      transform: 'scale(1.1)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

export const styles = {
  'ui-slider': uiSlider,
  'ui-slider-control': uiSliderControl,
  'ui-slider-track': uiSliderTrack,
  'ui-slider-indicator': uiSliderIndicator,
  'ui-slider-thumb': uiSliderThumb,
} as const
