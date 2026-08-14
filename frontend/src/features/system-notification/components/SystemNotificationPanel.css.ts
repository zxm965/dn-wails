import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const notificationPulseKeyframes = keyframes({
  '0%,\n  100%': { opacity: '0.42' },
  '50%': { opacity: '1' },
})

const systemNotificationPanel = style({
  position: 'relative',
  width: 'min(var(--page-content-max-width), 100%)',
  overflow: 'hidden',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'system-notification',
  containerType: 'inline-size',
})

const isEmbedded = style({
  selectors: {
    [`${systemNotificationPanel}&`]: {
      width: '100%',
      padding: 'clamp(16px, 2.2vw, 20px)',
      background:
        'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent-muted) 68%, transparent), transparent 30%), linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 97%, var(--accent) 3%), var(--surface-elevated))',
      border: '1px solid color-mix(in srgb, var(--accent) 16%, var(--border-subtle))',
      borderRadius: 'var(--panel-radius)',
      boxShadow: 'var(--surface-shadow)',
    },
    [`${systemNotificationPanel}&::after`]: {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '120px',
      height: '1px',
      content: '""',
      background: 'linear-gradient(90deg, transparent, var(--accent))',
      pointerEvents: 'none',
    },
  },
})

const systemNotificationHeading = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px',
    marginBottom: '14px',
  },
  {
    '@container': {
      'system-notification (max-width: 620px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const systemNotificationHeadingMain = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '12px',
})

const systemNotificationHeadingIcon = style({
  width: '40px',
  height: '40px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 82%, var(--surface-elevated))',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
  borderRadius: '12px',
})

const systemNotificationEyebrow = style({
  margin: '0 0 3px',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
})

const systemNotificationDescription = style({
  margin: '4px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.45',
})

const notificationStatus = style({
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  minHeight: '28px',
  padding: '0 10px',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  fontWeight: '700',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
})

const isReady = style({})
const isWarning = style({})
const isError = style({})
const isLoading = style({})

const notificationStatusDot = style({
  width: '7px',
  height: '7px',
  background: '#8b98a9',
  borderRadius: '50%',
  selectors: {
    [`${notificationStatus}${isReady} &`]: {
      background: '#07c160',
      boxShadow: '0 0 0 3px rgba(7, 193, 96, 0.14)',
    },
    [`${notificationStatus}${isWarning} &`]: {
      background: '#f5b942',
    },
    [`${notificationStatus}${isError} &`]: {
      background: '#ff756b',
    },
    [`${notificationStatus}${isLoading} &`]: {
      animation: `${notificationPulseKeyframes} 1.2s ease-in-out infinite`,
      '@media': {
        '(prefers-reduced-motion: reduce)': { animation: 'none' },
      },
    },
  },
})

const notificationPreview = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '12px',
  padding: '10px 12px',
  background:
    'linear-gradient(100deg, color-mix(in srgb, var(--accent-muted) 50%, var(--surface-elevated)), color-mix(in srgb, var(--surface-muted) 62%, transparent))',
  border: '1px solid color-mix(in srgb, var(--accent) 16%, var(--border-subtle))',
  borderRadius: '12px',
})

const notificationPreviewAvatar = style({
  width: '34px',
  height: '34px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--button-primary-text)',
  fontSize: '13px',
  fontWeight: '800',
  background: 'linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #052d1d))',
  borderRadius: '10px',
  boxShadow: '0 8px 16px color-mix(in srgb, var(--accent) 18%, transparent)',
})

const notificationPreviewCopy = style({
  minWidth: '0',
})

const notificationForm = style({
  minWidth: '0',
  display: 'grid',
  gap: '12px',
  padding: '14px',
  background: 'color-mix(in srgb, var(--surface-muted) 64%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
})

const notificationComposer = style({
  display: 'grid',
  gap: '10px',
})

const notificationField = style({
  position: 'relative',
  minWidth: '0',
})

const notificationSenderRow = style([
  {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        gridTemplateColumns: '1fr',
        gap: '6px',
      },
    },
  },
])

const notificationFieldHeading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '6px',
})

const notificationFieldCounter = style({
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  fontVariantNumeric: 'tabular-nums',
})

const notificationFooter = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    paddingTop: '11px',
    borderTop: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'system-notification (max-width: 680px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const notificationFeedback = style({
  minWidth: '0',
  flex: '1',
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  lineHeight: '1.5',
  overflowWrap: 'anywhere',
  selectors: {
    [`&${isError}`]: { color: 'var(--danger-text)' },
  },
})

const notificationActions = style([
  {
    flex: '0 0 auto',
    display: 'flex',
    gap: '8px',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        flexDirection: 'column-reverse',
      },
    },
  },
])

const notificationButton = style({
  padding: '0 13px',
  fontSize: '10px',
  fontWeight: '700',
  border: '1px solid transparent',
  borderRadius: '9px',
  ':disabled': {
    cursor: 'not-allowed',
    opacity: '0.5',
  },
  '@container': {
    'system-notification (max-width: 440px)': {
      width: '100%',
    },
  },
})

const notificationButtonPrimary = style({
  color: 'var(--button-primary-text)',
  background: 'var(--accent)',
  selectors: {
    '&:hover:not(:disabled)': { background: 'var(--accent-hover)' },
  },
})

const notificationButtonSecondary = style({
  color: 'var(--text-primary)',
  background: 'var(--surface-elevated)',
  borderColor: 'var(--border-strong)',
  selectors: {
    '&:hover:not(:disabled)': { background: 'var(--surface-hover)' },
  },
})

export const styles = {
  'system-notification-panel': systemNotificationPanel,
  'is-embedded': isEmbedded,
  'system-notification-heading': systemNotificationHeading,
  'system-notification-heading-main': systemNotificationHeadingMain,
  'system-notification-heading-icon': systemNotificationHeadingIcon,
  'system-notification-eyebrow': systemNotificationEyebrow,
  'system-notification-description': systemNotificationDescription,
  'notification-status': notificationStatus,
  'notification-status-dot': notificationStatusDot,
  'is-ready': isReady,
  'is-warning': isWarning,
  'is-error': isError,
  'is-loading': isLoading,
  'notification-preview': notificationPreview,
  'notification-preview-avatar': notificationPreviewAvatar,
  'notification-preview-copy': notificationPreviewCopy,
  'notification-form': notificationForm,
  'notification-composer': notificationComposer,
  'notification-field': notificationField,
  'notification-sender-row': notificationSenderRow,
  'notification-field-heading': notificationFieldHeading,
  'notification-field-counter': notificationFieldCounter,
  'notification-footer': notificationFooter,
  'notification-feedback': notificationFeedback,
  'notification-actions': notificationActions,
  'notification-button': notificationButton,
  'notification-button-primary': notificationButtonPrimary,
  'notification-button-secondary': notificationButtonSecondary,
} as const

globalStyle(`${systemNotificationHeadingIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${systemNotificationHeading} h1`, {
  margin: '0',
  fontSize: 'clamp(24px, 4vw, 34px)',
  lineHeight: '1.15',
})

globalStyle(`${systemNotificationHeading} h2`, {
  margin: '0',
  fontSize: '15px',
})

globalStyle(`${notificationPreviewCopy} > span`, {
  display: 'block',
  color: 'var(--accent)',
  fontSize: '7px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${notificationPreviewCopy} strong`, {
  display: 'block',
  overflow: 'hidden',
  marginTop: '2px',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${notificationPreviewCopy} p`, {
  overflow: 'hidden',
  margin: '2px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${notificationField} label`, {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  fontWeight: '700',
})

globalStyle(`${notificationSenderRow} label`, {
  margin: '0',
  whiteSpace: 'nowrap',
})

globalStyle(`${notificationFieldHeading} label`, {
  margin: '0',
})

globalStyle(
  `${notificationField} input,
${notificationField} textarea`,
  {
    width: '100%',
    color: 'var(--text-primary)',
    fontSize: '10px',
    background: 'color-mix(in srgb, var(--surface-elevated) 78%, transparent)',
    border: '1px solid var(--border-strong)',
    borderRadius: '9px',
    outline: 'none',
    transition: 'border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease',
  },
)

globalStyle(`${notificationField} input`, {
  height: '36px',
  padding: '0 10px',
})

globalStyle(`${notificationField} textarea`, {
  minHeight: '68px',
  padding: '9px 10px',
  lineHeight: '1.45',
  resize: 'vertical',
})

globalStyle(
  `${notificationField} input:hover,
${notificationField} textarea:hover`,
  { background: 'var(--surface-hover)' },
)

globalStyle(
  `${notificationField} input:focus,
${notificationField} textarea:focus`,
  {
    background: 'var(--surface-hover)',
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-muted)',
  },
)

globalStyle(
  `${notificationField} input:disabled,
${notificationField} textarea:disabled`,
  {
    cursor: 'not-allowed',
    opacity: '0.56',
  },
)

globalStyle(`${notificationButton} svg`, {
  width: '13px',
  height: '13px',
})
