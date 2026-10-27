import { style, styleVariants } from '@vanilla-extract/css'

const root = style({
  display: 'grid',
  alignItems: 'end',
  gap: 'calc(12px * var(--layout-spacing))',
})

const variants = styleVariants(
  {
    roles: { gridTemplateColumns: 'minmax(140px, 1fr) minmax(150px, 1fr) minmax(120px, 0.7fr) auto' },
    weekly: { gridTemplateColumns: 'minmax(130px, 1fr) minmax(140px, 1fr) minmax(110px, 0.7fr) auto' },
  },
  (rule) => ({
    ...rule,
    '@container': {
      'dn-page (max-width: 880px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
      'dn-page (max-width: 620px)': { gridTemplateColumns: '1fr' },
    },
  }),
)

const actions = style({
  display: 'flex',
  gap: '8px',
  '@container': {
    'dn-page (max-width: 880px)': { alignSelf: 'end' },
    'dn-page (max-width: 410px)': { alignItems: 'stretch', flexDirection: 'column' },
  },
})

export const styles = { root, variants, actions }
