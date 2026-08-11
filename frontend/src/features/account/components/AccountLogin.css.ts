import { style } from '@vanilla-extract/css'

const accountAuthPage = style({
  minHeight: '100%',
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(20px, 5vw, 48px)',
})

const accountAuthCard = style({
  width: 'min(100%, 440px)',
})

const accountAuthHeader = style({
  display: 'grid',
  justifyItems: 'center',
  textAlign: 'center',
})

const accountAuthMark = style({
  width: '48px',
  height: '48px',
  display: 'grid',
  placeItems: 'center',
  marginBottom: '12px',
  color: 'var(--accent)',
  background: 'var(--accent-muted)',
  borderRadius: '14px',
})

const accountAuthTabs = style({
  width: '100%',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
})

const accountAuthForm = style({
  display: 'grid',
  gap: '16px',
  marginTop: '18px',
})

const accountAuthRegisterNote = style({
  margin: '5px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

const accountAuthSubmit = style({
  width: '100%',
})

const accountAlert = style({
  display: 'grid',
  gap: '4px',
  marginBottom: '14px',
  padding: '12px 14px',
  color: '#e7a72f',
  fontSize: '12px',
  background: 'rgba(231, 167, 47, 0.1)',
  border: '1px solid rgba(231, 167, 47, 0.2)',
  borderRadius: '10px',
})

const accountField = style({
  minWidth: '0',
  display: 'grid',
  gap: '7px',
})

export const styles = {
  'account-auth-page': accountAuthPage,
  'account-auth-card': accountAuthCard,
  'account-auth-header': accountAuthHeader,
  'account-auth-mark': accountAuthMark,
  'account-auth-tabs': accountAuthTabs,
  'account-auth-form': accountAuthForm,
  'account-auth-register-note': accountAuthRegisterNote,
  'account-auth-submit': accountAuthSubmit,
  'account-alert': accountAlert,
  'account-field': accountField,
} as const
