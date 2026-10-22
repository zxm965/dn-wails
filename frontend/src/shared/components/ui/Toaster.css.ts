import { style } from '@vanilla-extract/css'

const toast = style({
  selectors: {
    "&[data-sonner-toast][data-styled='true']": { fontSize: 'var(--font-size-body)' },
  },
})
const description = style({
  selectors: {
    [`${toast}[data-styled='true'] &[data-description]`]: { fontSize: 'var(--font-size-secondary)' },
  },
})
const action = style({
  selectors: {
    [`${toast}[data-styled='true'] &[data-button]`]: { fontSize: 'var(--font-size-secondary)' },
  },
})

export const styles = { toast, description, action }
