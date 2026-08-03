import { globalStyle, style } from '@vanilla-extract/css'

import { styles as buttonStyles } from '../../../shared/components/ui/Button.css'
import { styles as cardStyles } from '../../../shared/components/ui/Card.css'

const dnPage = style({
  width: 'min(1180px, 100%)',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'dn-page',
  containerType: 'inline-size',
})

const dnAuthPage = style({
  minHeight: '100%',
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(20px, 5vw, 48px)',
})

const dnAuthCard = style({
  width: 'min(100%, 440px)',
})

const dnAuthMark = style({
  width: '48px',
  height: '48px',
  display: 'grid',
  placeItems: 'center',
  marginBottom: '12px',
  color: 'var(--accent)',
  background: 'var(--accent-muted)',
  borderRadius: '14px',
})

const dnAuthTabs = style({
  width: '100%',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
})

const dnAuthForm = style({
  display: 'grid',
  gap: '16px',
  marginTop: '18px',
})

const dnAuthRegisterNote = style({
  margin: '5px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

const dnDashboardOverview = style([
  {
    display: 'grid',
    alignItems: 'start',
    gridTemplateColumns: 'minmax(0, 1.65fr) minmax(280px, 0.75fr)',
    gap: '16px',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnDashboardGrid = style([
  {
    display: 'grid',
    alignItems: 'start',
    gridTemplateColumns: 'minmax(0, 1.65fr) minmax(280px, 0.75fr)',
    gap: '16px',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnProgressCard = style({})

const dnPriorityCard = style({
  background:
    'linear-gradient(\n    180deg,\n    var(--surface-elevated),\n    color-mix(in srgb, var(--surface-muted) 50%, transparent)\n  )',
})

const dnProgressSummary = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '28px',
    padding: 'clamp(20px, 3vw, 28px)',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnKicker = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: '800',
})

const dnProgressValue = style({
  marginTop: '8px',
  fontSize: 'clamp(46px, 8vw, 66px)',
  fontWeight: '850',
  letterSpacing: '-0.04em',
  lineHeight: '1',
})

const dnProgressRing = style([
  {
    width: '124px',
    height: '124px',
    display: 'grid',
    placeItems: 'center',
    padding: '9px',
    background: 'conic-gradient(var(--accent) var(--dn-progress), var(--surface-muted) 0deg)',
    borderRadius: '50%',
    vars: {
      '--dn-progress': '0deg',
    },
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        width: '108px',
        height: '108px',
        justifySelf: 'center',
      },
    },
  },
])

const dnOverviewMetrics = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    borderTop: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnPendingCopy = style({
  minHeight: '40px',
  margin: '16px 0 18px !important',
  lineHeight: '1.55',
})

const dnCardHeadingRow = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  '@container': {
    'dn-page (max-width: 410px)': {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
  },
})

const dnCardHeaderCopy = style({
  margin: '4px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const dnCompleteState = style({
  minHeight: '240px',
  display: 'grid',
  placeContent: 'center',
  justifyItems: 'center',
  gap: '8px',
  textAlign: 'center',
})

const dnPendingGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnPendingItem = style({
  minWidth: '0',
  padding: '13px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '11px',
})

const dnInlineProgress = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  margin: '22px 0 8px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  selectors: {
    [`${dnPendingItem} &`]: {
      margin: '13px 0 7px',
    },
  },
})

const dnTicketList = style({
  display: 'grid',
  gap: '8px',
})

const dnFilterGrid = style({
  display: 'grid',
  alignItems: 'end',
  gap: '12px',
})

const dnRoleFilterGrid = style([
  {
    gridTemplateColumns: 'minmax(140px, 1fr) minmax(150px, 1fr) minmax(120px, 0.7fr) auto',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnWeeklyFilterGrid = style([
  {
    gridTemplateColumns: 'minmax(130px, 1fr) minmax(140px, 1fr) minmax(110px, 0.7fr) minmax(150px, 1fr) auto',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnMessageFilters = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 180px auto',
    alignItems: 'end',
    gap: '12px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnField = style({
  minWidth: '0',
  display: 'grid',
  gap: '7px',
})

const dnFilterActions = style([
  {
    display: 'flex',
    gap: '8px',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        alignSelf: 'end',
      },
    },
  },
  {
    '@container': {
      'dn-page (max-width: 410px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const dnViewSwitch = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '3px',
  marginBottom: '12px',
})

const dnTableWrap = style({
  maxWidth: '100%',
  overflowX: 'auto',
  border: '1px solid var(--border-subtle)',
  borderRadius: '10px',
})

const dnTable = style({
  width: '100%',
  minWidth: '760px',
  borderCollapse: 'collapse',
  fontSize: '12px',
})

const dnTableRemark = style({
  maxWidth: '240px',
  overflow: 'hidden',
  color: 'var(--text-secondary)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const dnDangerAction = style({
  color: 'var(--danger-text)',
})

const dnRoleCards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
  gap: '12px',
})

const dnPlanGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
  gap: '12px',
})

const dnRoleCard = style([
  {
    minWidth: '0',
    display: 'grid',
    gap: '13px',
    padding: '15px',
    background: 'color-mix(in srgb, var(--surface-muted) 42%, transparent)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    transition: 'opacity 140ms ease,\n    border-color 140ms ease,\n    background-color 140ms ease',
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  {
    selectors: {
      '&:hover': {
        background: 'var(--surface-muted)',
        borderColor: 'var(--border-strong)',
      },
    },
  },
])

const dnPlanCard = style([
  {
    minWidth: '0',
    display: 'grid',
    gap: '13px',
    padding: '15px',
    background: 'color-mix(in srgb, var(--surface-muted) 42%, transparent)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    transition: 'opacity 140ms ease,\n    border-color 140ms ease,\n    background-color 140ms ease',
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  {
    selectors: {
      '&:hover': {
        background: 'var(--surface-muted)',
        borderColor: 'var(--border-strong)',
      },
    },
  },
])

const isUpdating = style({
  selectors: {
    [`${dnPlanCard}&`]: {
      opacity: '0.68',
    },
  },
})

const dnRowActions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '3px',
  selectors: {
    [`${dnRoleCard} &, ${dnPlanCard} &`]: {
      paddingTop: '10px',
      borderTop: '1px solid var(--border-subtle)',
    },
  },
})

const dnRoleStats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
})

const dnPlanRemark = style({
  minHeight: '34px',
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.5',
})

const dnFormGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnFormFull = style({
  gridColumn: '1 / -1',
})

const dnAlert = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 14px',
  fontSize: '12px',
  border: '1px solid',
  borderRadius: '10px',
})

const dnAlertWarning = style({
  color: '#e7a72f',
  background: 'rgba(231, 167, 47, 0.1)',
  borderColor: 'rgba(231, 167, 47, 0.2)',
})

const dnPlanSection = style({
  display: 'grid',
  gap: '8px',
})

const dnSectionHeading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  fontWeight: '750',
})

const dnStatusGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '5px',
  },
  {
    '@container': {
      'dn-page (max-width: 410px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnStatusToggle = style({
  minWidth: '0',
  padding: '0 6px',
  fontSize: '10px',
  overflow: 'visible',
})

const dnTicketChips = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
})

const dnMuted = style({
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const dnPlanFlags = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnEditorSwitches = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnSwitchRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '9px 10px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  background: 'var(--surface-muted)',
  borderRadius: '9px',
})

const dnPlanEditor = style({
  display: 'grid',
  gap: '24px',
})

const dnNestPicker = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'dn-page (max-width: 880px)': {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'dn-page (max-width: 410px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const isSelected = style({
  selectors: {
    [`${dnStatusToggle}&`]: {
      color: 'var(--accent)',
      background: 'var(--accent-muted)',
      borderColor: 'var(--accent)',
    },
    [`${dnStatusToggle}&::after`]: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      width: '14px',
      height: '14px',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--button-primary-text)',
      fontSize: '9px',
      background: 'var(--accent)',
      borderRadius: '50%',
      content: "'✓'",
    },
    [`${dnNestPicker} label&`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
      borderColor: 'var(--accent)',
    },
  },
})

const dnTicketEditor = style({
  display: 'grid',
  gap: '8px',
})

const dnEmptyAction = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: '-56px',
  paddingBottom: '20px',
})

const dnMessageList = style({
  display: 'grid',
  gap: '8px',
})

const dnMessageItem = style([
  {
    minWidth: '0',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '12px',
    padding: '13px',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    borderRadius: '11px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: 'auto minmax(0, 1fr)',
      },
    },
  },
])

const isUnread = style({
  selectors: {
    [`${dnMessageItem}&`]: {
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
    },
  },
})

const dnMessageIcon = style({
  width: '38px',
  height: '38px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
})

const isInfo = style({
  selectors: {
    [`${dnMessageIcon}&`]: {
      color: '#57beff',
      background: 'rgba(87, 190, 255, 0.12)',
    },
  },
})

const isSuccess = style({
  selectors: {
    [`${dnMessageIcon}&`]: {
      color: '#26c876',
      background: 'rgba(24, 183, 104, 0.12)',
    },
  },
})

const isWarning = style({
  selectors: {
    [`${dnMessageIcon}&`]: {
      color: '#e7a72f',
      background: 'rgba(231, 167, 47, 0.12)',
    },
  },
})

const isError = style({
  selectors: {
    [`${dnMessageIcon}&`]: {
      color: 'var(--danger-text)',
      background: 'var(--danger-background)',
    },
  },
})

const dnMessageTitle = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: '800',
})

const dnMessageContent = style({
  display: 'block',
  overflow: 'hidden',
  marginTop: '5px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.55',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '2',
})

const dnMessageDialogCopy = style({
  margin: '0',
  color: 'var(--text-secondary)',
  lineHeight: '1.75',
  whiteSpace: 'pre-wrap',
})

const dnMessageCenterTrigger = style({
  position: 'relative',
  minWidth: '30px',
  padding: '0',
})

const dnMessageCenterIndicator = style({
  position: 'absolute',
  top: '5px',
  right: '5px',
  width: '6px',
  height: '6px',
  background: '#d84d45',
  borderRadius: '50%',
  boxShadow: '0 0 0 1.5px var(--titlebar-background)',
})

const dnMessageCenterHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  paddingRight: '34px',
})

const dnMessageCenterBody = style({
  padding: '0',
})

const dnMessageCenterList = style({
  maxHeight: 'min(52vh, 430px)',
  display: 'grid',
  gap: '3px',
  overflow: 'auto',
  padding: '8px',
})

const dnMessageCenterItem = style({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '10px',
  padding: '0 10px',
  textAlign: 'left',
})

const dnMessageCenterFooter = style({
  justifyContent: 'space-between',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const dnMessagePopupContent = style({
  margin: '0',
  color: 'var(--text-secondary)',
  lineHeight: '1.75',
  whiteSpace: 'pre-wrap',
})

const dnAccountPage = style({
  width: 'min(900px, 100%)',
})

const dnAccountForm = style([
  {
    display: 'grid',
    gridTemplateColumns: '150px minmax(0, 1fr)',
    gap: '24px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnAvatarPanel = style({
  display: 'grid',
  alignContent: 'start',
  justifyItems: 'center',
  gap: '10px',
})

const dnAccountFooter = style({
  justifyContent: 'flex-end',
})

const dnSecurityForm = style([
  {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'start',
    gap: '18px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnFieldFull = style({
  gridColumn: '1 / -1',
})

const dnStorageInfo = style([
  {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: '18px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

export const styles = {
  'dn-page': dnPage,
  'dn-auth-page': dnAuthPage,
  'dn-auth-card': dnAuthCard,
  'dn-auth-mark': dnAuthMark,
  'dn-auth-tabs': dnAuthTabs,
  'dn-auth-form': dnAuthForm,
  'dn-auth-register-note': dnAuthRegisterNote,
  'dn-dashboard-overview': dnDashboardOverview,
  'dn-dashboard-grid': dnDashboardGrid,
  'dn-progress-card': dnProgressCard,
  'dn-priority-card': dnPriorityCard,
  'dn-progress-summary': dnProgressSummary,
  'dn-kicker': dnKicker,
  'dn-progress-value': dnProgressValue,
  'dn-progress-ring': dnProgressRing,
  'dn-overview-metrics': dnOverviewMetrics,
  'dn-pending-copy': dnPendingCopy,
  'dn-card-heading-row': dnCardHeadingRow,
  'dn-card-header-copy': dnCardHeaderCopy,
  'dn-inline-progress': dnInlineProgress,
  'dn-complete-state': dnCompleteState,
  'dn-pending-grid': dnPendingGrid,
  'dn-pending-item': dnPendingItem,
  'dn-ticket-list': dnTicketList,
  'dn-filter-grid': dnFilterGrid,
  'dn-role-filter-grid': dnRoleFilterGrid,
  'dn-weekly-filter-grid': dnWeeklyFilterGrid,
  'dn-message-filters': dnMessageFilters,
  'dn-field': dnField,
  'dn-filter-actions': dnFilterActions,
  'dn-view-switch': dnViewSwitch,
  'dn-table-wrap': dnTableWrap,
  'dn-table': dnTable,
  'dn-table-remark': dnTableRemark,
  'dn-row-actions': dnRowActions,
  'dn-danger-action': dnDangerAction,
  'dn-role-cards': dnRoleCards,
  'dn-plan-grid': dnPlanGrid,
  'dn-role-card': dnRoleCard,
  'dn-plan-card': dnPlanCard,
  'is-updating': isUpdating,
  'dn-role-stats': dnRoleStats,
  'dn-plan-remark': dnPlanRemark,
  'dn-form-grid': dnFormGrid,
  'dn-form-full': dnFormFull,
  'dn-alert': dnAlert,
  'dn-alert-warning': dnAlertWarning,
  'dn-plan-section': dnPlanSection,
  'dn-section-heading': dnSectionHeading,
  'dn-status-grid': dnStatusGrid,
  'dn-status-toggle': dnStatusToggle,
  'is-selected': isSelected,
  'dn-ticket-chips': dnTicketChips,
  'dn-muted': dnMuted,
  'dn-plan-flags': dnPlanFlags,
  'dn-editor-switches': dnEditorSwitches,
  'dn-switch-row': dnSwitchRow,
  'dn-plan-editor': dnPlanEditor,
  'dn-nest-picker': dnNestPicker,
  'dn-ticket-editor': dnTicketEditor,
  'dn-empty-action': dnEmptyAction,
  'dn-message-list': dnMessageList,
  'dn-message-item': dnMessageItem,
  'is-unread': isUnread,
  'dn-message-icon': dnMessageIcon,
  'is-info': isInfo,
  'is-success': isSuccess,
  'is-warning': isWarning,
  'is-error': isError,
  'dn-message-title': dnMessageTitle,
  'dn-message-content': dnMessageContent,
  'dn-message-dialog-copy': dnMessageDialogCopy,
  'dn-message-center-trigger': dnMessageCenterTrigger,
  'dn-message-center-indicator': dnMessageCenterIndicator,
  'dn-message-center-header': dnMessageCenterHeader,
  'dn-message-center-body': dnMessageCenterBody,
  'dn-message-center-list': dnMessageCenterList,
  'dn-message-center-item': dnMessageCenterItem,
  'dn-message-center-footer': dnMessageCenterFooter,
  'dn-message-popup-content': dnMessagePopupContent,
  'dn-account-page': dnAccountPage,
  'dn-account-form': dnAccountForm,
  'dn-avatar-panel': dnAvatarPanel,
  'dn-account-footer': dnAccountFooter,
  'dn-security-form': dnSecurityForm,
  'dn-field-full': dnFieldFull,
  'dn-storage-info': dnStorageInfo,
} as const

globalStyle(`${dnPage} p`, {
  overflowWrap: 'anywhere',
})

globalStyle(`${dnAuthCard} ${cardStyles['ui-card-header']}`, {
  display: 'grid',
  justifyItems: 'center',
  textAlign: 'center',
})

globalStyle(`${dnAuthMark} svg`, {
  width: '24px',
  height: '24px',
})

globalStyle(`${dnAuthForm} > ${buttonStyles.root}`, {
  width: '100%',
})

globalStyle(
  `${dnProgressCard} ${cardStyles['ui-card-content']},
${dnPriorityCard} ${cardStyles['ui-card-content']}`,
  {
    padding: '0',
  },
)

globalStyle(`${dnKicker} svg`, {
  width: '16px',
  height: '16px',
})

globalStyle(`${dnProgressValue} small`, {
  marginLeft: '5px',
  color: 'var(--text-secondary)',
  fontSize: '20px',
})

globalStyle(`${dnProgressSummary} p`, {
  margin: '8px 0 18px',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

globalStyle(`${dnProgressRing} > span`, {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeContent: 'center',
  textAlign: 'center',
  background: 'var(--surface-elevated)',
  borderRadius: '50%',
})

globalStyle(
  `${dnProgressRing} strong,
${dnProgressRing} small,
${dnOverviewMetrics} strong,
${dnOverviewMetrics} span`,
  {
    display: 'block',
  },
)

globalStyle(`${dnProgressRing} strong`, {
  fontSize: '18px',
})

globalStyle(`${dnProgressRing} small`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

globalStyle(`${dnOverviewMetrics} > div`, {
  padding: '15px 20px',
})

globalStyle(`${dnOverviewMetrics} > div + div`, {
  borderLeft: '1px solid var(--border-subtle)',
})

globalStyle(`${dnOverviewMetrics} strong`, {
  fontSize: '17px',
})

globalStyle(`${dnOverviewMetrics} span`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

globalStyle(`${dnPriorityCard} ${cardStyles['ui-card-content']}`, {
  minHeight: '286px',
  display: 'flex',
  flexDirection: 'column',
  padding: '22px',
})

globalStyle(`${dnPriorityCard} h2`, {
  margin: '24px 0 0',
  fontSize: '22px',
})

globalStyle(`${dnPriorityCard} p`, {
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '12px',
})

globalStyle(`${dnPriorityCard} ${buttonStyles.root}`, {
  width: '100%',
  marginTop: 'auto',
})

globalStyle(`${dnCardHeadingRow} > div`, {
  minWidth: '0',
})

globalStyle(
  `${dnCardHeadingRow} strong,
${dnCardHeadingRow} span,
${dnCardHeadingRow} p`,
  {
    display: 'block',
  },
)

globalStyle(
  `${dnCardHeadingRow} span,
${dnCardHeadingRow} p`,
  {
    margin: '4px 0 0',
    color: 'var(--text-tertiary)',
    fontSize: '11px',
  },
)

globalStyle(`${dnInlineProgress} span`, {
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${dnInlineProgress} strong`, {
  color: 'var(--text-primary)',
  fontSize: '12px',
})

globalStyle(`${dnCompleteState} svg`, {
  width: '42px',
  height: '42px',
  color: 'var(--accent)',
})

globalStyle(`${dnCompleteState} span`, {
  color: 'var(--text-secondary)',
  fontSize: '12px',
})

globalStyle(`${dnTicketList} article`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  background: 'var(--surface-muted)',
  borderRadius: '9px',
})

globalStyle(`${dnTicketList} article div`, {
  minWidth: '0',
})

globalStyle(
  `${dnTicketList} strong,
${dnTicketList} span`,
  {
    display: 'block',
  },
)

globalStyle(`${dnTicketList} strong`, {
  overflow: 'hidden',
  fontSize: '12px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${dnTicketList} article div span`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

globalStyle(
  `${dnTable} th,
${dnTable} td`,
  {
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-subtle)',
  },
)

globalStyle(`${dnTable} th`, {
  color: 'var(--text-secondary)',
  fontSize: '10px',
  letterSpacing: '0.04em',
  background: 'var(--surface-muted)',
})

globalStyle(`${dnTable} tbody tr:last-child td`, {
  borderBottom: '0',
})

globalStyle(`${dnTable} tbody tr:hover`, {
  background: 'var(--surface-muted)',
})

globalStyle(`${dnTable} td:last-child`, {
  textAlign: 'right',
})

globalStyle(`${dnRoleStats} span`, {
  display: 'grid',
  gap: '4px',
  padding: '10px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  background: 'var(--surface-muted)',
  borderRadius: '8px',
})

globalStyle(`${dnRoleStats} strong`, {
  color: 'var(--text-primary)',
  fontSize: '12px',
})

globalStyle(`${dnRoleCard} > p`, {
  minHeight: '34px',
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.5',
})

globalStyle(`${dnSectionHeading} ${buttonStyles.root}`, {
  width: 'var(--button-height-sm)',
  padding: '0',
})

globalStyle(`${dnTicketChips} > span`, {
  display: 'inline-flex',
  alignItems: 'center',
  overflow: 'hidden',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
})

globalStyle(`${dnTicketChips} ${buttonStyles.root}`, {
  width: 'var(--button-height-sm)',
  padding: '0',
  borderRadius: '0',
})

globalStyle(
  `${dnPlanFlags} label,
${dnEditorSwitches} label`,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '9px 10px',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    background: 'var(--surface-muted)',
    borderRadius: '9px',
  },
)

globalStyle(`${dnPlanEditor} > section`, {
  display: 'grid',
  gap: '10px',
})

globalStyle(`${dnNestPicker} label`, {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  border: '1px solid var(--border-subtle)',
  borderRadius: '9px',
})

globalStyle(`${dnTicketEditor} > div`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(130px, 1fr) minmax(120px, 0.7fr) auto',
  gap: '8px',
  padding: '10px',
  background: 'var(--surface-muted)',
  borderRadius: '10px',
})

globalStyle(`${dnMessageItem} > span:nth-child(2)`, {
  minWidth: '0',
})

globalStyle(`${dnMessageIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${dnMessageItem} small`, {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: '11px',
})

globalStyle(`${dnMessageItem} small`, {
  marginTop: '7px',
  color: 'var(--text-tertiary)',
})

globalStyle(`${dnMessageItem} > ${buttonStyles.root}`, {
  maxWidth: '160px',
})

globalStyle(`${dnMessageCenterTrigger} > svg`, {
  width: '16px',
  height: '16px',
})

globalStyle(`${dnMessageCenterItem} > span:nth-child(2)`, {
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

globalStyle(
  `${dnMessageCenterItem} strong,
${dnMessageCenterItem} time`,
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
)

globalStyle(`${dnMessageCenterItem} strong`, {
  minWidth: '0',
  flex: '1',
  fontSize: '12px',
  whiteSpace: 'nowrap',
})

globalStyle(`${dnMessageCenterItem} time`, {
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  whiteSpace: 'nowrap',
})

globalStyle(`${dnMessageCenterItem} > svg`, {
  width: '14px',
  height: '14px',
  color: 'var(--text-tertiary)',
})

globalStyle(`${dnSwitchRow} > span`, {
  minWidth: '0',
})

globalStyle(
  `${dnSwitchRow} strong,
${dnSwitchRow} small`,
  {
    display: 'block',
  },
)

globalStyle(`${dnSwitchRow} small`, {
  marginTop: '3px',
  color: 'var(--text-tertiary)',
})

globalStyle(`${dnSecurityForm} > svg`, {
  width: '38px',
  height: '38px',
  color: 'var(--accent)',
})

globalStyle(`${dnStorageInfo} > svg`, {
  width: '38px',
  height: '38px',
  color: 'var(--accent)',
})

globalStyle(
  `${dnStorageInfo} h2,
${dnStorageInfo} p`,
  {
    margin: '0',
  },
)

globalStyle(`${dnStorageInfo} h2`, {
  fontSize: '17px',
})

globalStyle(`${dnStorageInfo} p`, {
  marginTop: '9px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.65',
})

globalStyle(`${dnPriorityCard} ${cardStyles['ui-card-content']}`, {
  '@container': {
    'dn-page (max-width: 880px)': {
      minHeight: '250px',
    },
  },
})

globalStyle(`${dnSecurityForm} > svg`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      display: 'none',
    },
  },
})

globalStyle(`${dnFilterActions} ${buttonStyles.root}`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      flex: '1',
    },
  },
})

globalStyle(`${dnMessageItem} > ${buttonStyles.root}`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      maxWidth: 'none',
      gridColumn: '1 / -1',
    },
  },
})

globalStyle(`${dnTicketEditor} > div`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      gridTemplateColumns: '1fr',
    },
  },
})

globalStyle(`${dnOverviewMetrics} > div + div`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      borderTop: '1px solid var(--border-subtle)',
      borderLeft: '0',
    },
  },
})

globalStyle(`${dnTicketList} article`, {
  '@container': {
    'dn-page (max-width: 410px)': {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
  },
})

globalStyle(
  `${dnFilterActions} ${buttonStyles.root},
  ${dnCardHeadingRow} > ${buttonStyles.root}`,
  {
    '@container': {
      'dn-page (max-width: 410px)': {
        width: '100%',
      },
    },
  },
)
