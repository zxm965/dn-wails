import { style } from '@vanilla-extract/css'

const accountPage = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'account-page',
  containerType: 'inline-size',
})

const accountField = style({
  minWidth: '0',
  display: 'grid',
  gap: '7px',
})

const accountFieldFull = style({
  gridColumn: '1 / -1',
})

const accountCardHeading = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  {
    '@container': {
      'account-page (max-width: 430px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const accountCardHeadingCopy = style({
  minWidth: '0',
})

const accountCardDescription = style({
  margin: '5px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const accountProfileForm = style([
  {
    display: 'grid',
    gridTemplateColumns: '150px minmax(0, 1fr)',
    gap: '24px',
  },
  {
    '@container': {
      'account-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const accountAvatarPanel = style({
  display: 'grid',
  alignContent: 'start',
  justifyItems: 'center',
  gap: '10px',
})

const accountProfileAvatar = style({
  width: '88px',
  height: '88px',
})

const accountFormGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },
  {
    '@container': {
      'account-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const accountFooter = style({
  justifyContent: 'flex-end',
})

const accountSecurityForm = style([
  {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'start',
    gap: '18px',
  },
  {
    '@container': {
      'account-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const accountSecurityIcon = style({
  width: '28px',
  height: '28px',
  color: 'var(--accent)',
})

export const styles = {
  'account-page': accountPage,
  'account-field': accountField,
  'account-field-full': accountFieldFull,
  'account-card-heading': accountCardHeading,
  'account-card-heading-copy': accountCardHeadingCopy,
  'account-card-description': accountCardDescription,
  'account-profile-form': accountProfileForm,
  'account-avatar-panel': accountAvatarPanel,
  'account-profile-avatar': accountProfileAvatar,
  'account-form-grid': accountFormGrid,
  'account-footer': accountFooter,
  'account-security-form': accountSecurityForm,
  'account-security-icon': accountSecurityIcon,
} as const
