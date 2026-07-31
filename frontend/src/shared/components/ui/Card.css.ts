import { style } from '@vanilla-extract/css'

const uiCard = style({
  minWidth: '0',
  color: 'var(--text-primary)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const uiCardHeader = style({
  padding: 'var(--panel-padding)',
})

const uiCardContent = style({
  padding: 'var(--panel-padding)',
  selectors: {
    [`${uiCardHeader} + &`]: {
      borderTop: '1px solid var(--border-subtle)',
    },
  },
})

const uiCardFooter = style([
  {
    padding: 'var(--panel-padding)',
  },
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    selectors: {
      [`${uiCardContent} + &`]: {
        borderTop: '1px solid var(--border-subtle)',
      },
    },
  },
])

const uiCardTitle = style([
  {
    margin: '0',
  },
  {
    fontSize: '16px',
  },
])

const uiCardDescription = style([
  {
    margin: '0',
  },
  {
    marginTop: '5px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: '1.5',
  },
])

export const styles = {
  'ui-card': uiCard,
  'ui-card-header': uiCardHeader,
  'ui-card-content': uiCardContent,
  'ui-card-footer': uiCardFooter,
  'ui-card-title': uiCardTitle,
  'ui-card-description': uiCardDescription,
} as const
