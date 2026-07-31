import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const notificationPulseKeyframes = keyframes({
  '0%,\n  100%': {
    opacity: '0.42',
  },
  '50%': {
    opacity: '1',
  },
})

const systemNotificationPanel = style({
  width: 'min(980px, 100%)',
  minHeight: '100%',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'system-notification',
  containerType: 'inline-size',
})

const isEmbedded = style({
  selectors: {
    [`${systemNotificationPanel}&`]: {
      width: '100%',
      minHeight: 'auto',
      padding: 'var(--panel-padding)',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--panel-radius)',
      boxShadow: 'var(--surface-shadow)',
    },
  },
})

const systemNotificationHeading = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '28px',
    selectors: {
      [`${systemNotificationPanel}${isEmbedded} &`]: {
        marginBottom: '20px',
      },
    },
  },
  {
    '@container': {
      'system-notification (max-width: 720px)': {
        flexDirection: 'column',
      },
    },
  },
])

const systemNotificationEyebrow = style({
  margin: '0 0 8px',
  color: 'var(--accent)',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  selectors: {
    [`${systemNotificationPanel}${isEmbedded} &`]: {
      fontSize: '9px',
    },
  },
})

const systemNotificationDescription = style({
  margin: '12px 0 0',
  color: 'var(--text-secondary)',
  lineHeight: '1.6',
  selectors: {
    [`${systemNotificationPanel}${isEmbedded} &`]: {
      marginTop: '7px',
      fontSize: '10px',
    },
  },
})

const messagePreviewCard = style([
  {
    minWidth: '0',
    padding: 'var(--panel-padding)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
    selectors: {
      [`${systemNotificationPanel}${isEmbedded} &`]: {
        padding: '20px',
        boxShadow: 'none',
      },
    },
  },
  {
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(circle at 14% 5%, var(--accent-muted), transparent 38%), var(--surface-elevated)',
  },
])

const notificationForm = style([
  {
    minWidth: '0',
    padding: 'var(--panel-padding)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
    selectors: {
      [`${systemNotificationPanel}${isEmbedded} &`]: {
        padding: '20px',
        boxShadow: 'none',
      },
    },
  },
  {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
])

const notificationStatus = style([
  {
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '34px',
    padding: '0 12px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '999px',
  },
  {
    '@container': {
      'system-notification (max-width: 720px)': {
        alignSelf: 'flex-start',
      },
    },
  },
])

const isReady = style({})

const isWarning = style({})

const isError = style({})

const isLoading = style({})

const notificationStatusDot = style({
  width: '8px',
  height: '8px',
  background: '#8b98a9',
  borderRadius: '50%',
  selectors: {
    [`${notificationStatus}${isReady} &`]: {
      background: '#07c160',
      boxShadow: '0 0 0 4px rgba(7, 193, 96, 0.14)',
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
        '(prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      },
    },
  },
})

const systemNotificationGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)',
    gap: '22px',
    alignItems: 'stretch',
  },
  {
    '@container': {
      'system-notification (max-width: 720px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const messagePreviewToolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  paddingBottom: '18px',
  fontSize: '18px',
  fontWeight: '700',
  borderBottom: '1px solid var(--border-subtle)',
})

const messagePreviewCount = style({
  display: 'grid',
  width: '20px',
  height: '20px',
  placeItems: 'center',
  color: '#ffffff',
  fontSize: '11px',
  background: '#fa5151',
  borderRadius: '50%',
})

const messagePreviewItem = style([
  {
    position: 'relative',
    display: 'flex',
    gap: '14px',
    marginTop: '24px',
    padding: '16px',
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        gap: '10px',
        padding: '13px',
      },
    },
  },
])

const messagePreviewAvatar = style([
  {
    width: '48px',
    height: '48px',
    flex: '0 0 auto',
    display: 'grid',
    placeItems: 'center',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(145deg, #23d777, #06ae55)',
    borderRadius: '11px',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        width: '40px',
        height: '40px',
        fontSize: '17px',
      },
    },
  },
])

const messagePreviewBody = style({
  minWidth: '0',
  flex: '1',
})

const messagePreviewMeta = style([
  {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: '3px',
      },
    },
  },
])

const messagePreviewUnread = style({
  position: 'absolute',
  top: '-7px',
  right: '-7px',
  display: 'grid',
  minWidth: '22px',
  height: '22px',
  placeItems: 'center',
  padding: '0 6px',
  color: '#ffffff',
  fontSize: '11px',
  background: '#fa5151',
  border: '2px solid var(--surface-elevated)',
  borderRadius: '999px',
})

const messagePreviewTip = style([
  {
    margin: 'auto 0 0',
    paddingTop: '28px',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    lineHeight: '1.6',
  },
  {
    '@container': {
      'system-notification (max-width: 720px)': {
        marginTop: '10px',
      },
    },
  },
])

const notificationField = style({
  position: 'relative',
})

const notificationFieldCounter = style({
  position: 'absolute',
  right: '10px',
  bottom: '8px',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const notificationFeedback = style({
  minHeight: '22px',
  margin: '-2px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  lineHeight: '1.55',
  selectors: {
    [`&${isError}`]: {
      color: 'var(--danger-text)',
    },
  },
})

const notificationActions = style([
  {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: 'auto',
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        flexDirection: 'column-reverse',
      },
    },
  },
])

const notificationButton = style([
  {
    padding: '0 17px',
    fontSize: '13px',
    fontWeight: '700',
    border: '1px solid transparent',
    borderRadius: '9px',
    cursor: 'pointer',
    ':disabled': {
      cursor: 'not-allowed',
      opacity: '0.5',
    },
    ':focus-visible': {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '2px',
    },
  },
  {
    '@container': {
      'system-notification (max-width: 440px)': {
        width: '100%',
      },
    },
  },
])

const notificationButtonPrimary = style({
  color: '#ffffff',
  background: 'var(--accent)',
  selectors: {
    '&:hover:not(:disabled)': {
      background: 'var(--accent-hover)',
    },
  },
})

const notificationButtonSecondary = style({
  color: 'var(--text-primary)',
  background: 'var(--surface-muted)',
  borderColor: 'var(--border-strong)',
  selectors: {
    '&:hover:not(:disabled)': {
      background: 'var(--surface-hover)',
    },
  },
})

export const styles = {
  'system-notification-panel': systemNotificationPanel,
  'is-embedded': isEmbedded,
  'system-notification-heading': systemNotificationHeading,
  'system-notification-eyebrow': systemNotificationEyebrow,
  'system-notification-description': systemNotificationDescription,
  'message-preview-card': messagePreviewCard,
  'notification-form': notificationForm,
  'notification-status': notificationStatus,
  'notification-status-dot': notificationStatusDot,
  'is-ready': isReady,
  'is-warning': isWarning,
  'is-error': isError,
  'is-loading': isLoading,
  'system-notification-grid': systemNotificationGrid,
  'message-preview-toolbar': messagePreviewToolbar,
  'message-preview-count': messagePreviewCount,
  'message-preview-item': messagePreviewItem,
  'message-preview-avatar': messagePreviewAvatar,
  'message-preview-body': messagePreviewBody,
  'message-preview-meta': messagePreviewMeta,
  'message-preview-unread': messagePreviewUnread,
  'message-preview-tip': messagePreviewTip,
  'notification-field': notificationField,
  'notification-field-counter': notificationFieldCounter,
  'notification-feedback': notificationFeedback,
  'notification-actions': notificationActions,
  'notification-button': notificationButton,
  'notification-button-primary': notificationButtonPrimary,
  'notification-button-secondary': notificationButtonSecondary,
} as const

globalStyle(`${systemNotificationHeading} h1`, {
  margin: '0',
  fontSize: 'clamp(28px, 4vw, 40px)',
  lineHeight: '1.15',
})

globalStyle(`${systemNotificationHeading} h2`, {
  margin: '0',
  fontSize: '18px',
})

globalStyle(`${messagePreviewMeta} strong`, {
  minWidth: '0',
  overflow: 'hidden',
  fontSize: '15px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${messagePreviewMeta} time`, {
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '12px',
})

globalStyle(`${messagePreviewBody} p`, {
  display: '-webkit-box',
  overflow: 'hidden',
  margin: '7px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  lineHeight: '1.55',
  overflowWrap: 'anywhere',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '2',
})

globalStyle(`${notificationField} label`, {
  display: 'block',
  marginBottom: '8px',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  fontWeight: '600',
})

globalStyle(
  `${notificationField} input,
${notificationField} textarea`,
  {
    width: '100%',
    color: 'var(--text-primary)',
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-strong)',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 150ms ease,\n    background-color 150ms ease,\n    box-shadow 150ms ease',
  },
)

globalStyle(`${notificationField} input`, {
  height: '42px',
  padding: '0 12px',
})

globalStyle(`${notificationField} textarea`, {
  minHeight: '108px',
  padding: '11px 12px 28px',
  lineHeight: '1.55',
  resize: 'vertical',
})

globalStyle(
  `${notificationField} input:hover,
${notificationField} textarea:hover`,
  {
    background: 'var(--surface-hover)',
  },
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

globalStyle(`${systemNotificationHeading} h1`, {
  '@container': {
    'system-notification (max-width: 440px)': {
      fontSize: 'clamp(26px, 9vw, 34px)',
    },
  },
})

globalStyle(`${messagePreviewMeta} strong`, {
  '@container': {
    'system-notification (max-width: 440px)': {
      width: '100%',
    },
  },
})
