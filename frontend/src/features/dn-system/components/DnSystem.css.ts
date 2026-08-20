import { globalStyle, style } from '@vanilla-extract/css'

import { styles as buttonStyles } from '../../../shared/components/ui/Button.css'

const dnPage = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'dn-page',
  containerType: 'inline-size',
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
    gridTemplateColumns: 'minmax(130px, 1fr) minmax(140px, 1fr) minmax(110px, 0.7fr) auto',
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

const siteMessageFilters = style([
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 360px))',
  alignItems: 'start',
  justifyContent: 'start',
  gap: '14px',
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
    position: 'relative',
    minWidth: '0',
    display: 'grid',
    alignContent: 'start',
    gap: '14px',
    overflow: 'hidden',
    padding: '16px',
    background:
      'linear-gradient(150deg, color-mix(in srgb, var(--accent-muted) 26%, var(--surface-elevated)) 0%, color-mix(in srgb, var(--surface-muted) 44%, var(--surface-elevated)) 46%, color-mix(in srgb, var(--surface-muted) 28%, transparent) 100%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
    boxShadow: 'inset 0 2px 0 color-mix(in srgb, var(--accent) 36%, transparent)',
    transition:
      'opacity 140ms ease,\n    border-color 140ms ease,\n    box-shadow 140ms ease,\n    transform 140ms ease',
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
        borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border-strong))',
        boxShadow:
          'inset 0 2px 0 color-mix(in srgb, var(--accent) 52%, transparent), 0 12px 26px rgba(6, 12, 21, 0.08)',
        transform: 'translateY(-1px)',
      },
    },
  },
])

const dnPlanCardHeader = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '11px',
})

const dnPlanAvatar = style({
  width: '40px',
  height: '40px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  fontSize: '15px',
  fontWeight: '850',
  background: 'var(--accent-muted)',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
  borderRadius: '12px',
})

const dnPlanIdentity = style({
  minWidth: '0',
  display: 'grid',
  gap: '3px',
})

const dnPlanRoleName = style({
  overflow: 'hidden',
  fontSize: '14px',
  fontWeight: '850',
  lineHeight: '1.25',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const dnPlanProfession = style({
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

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
  margin: '0',
  padding: '9px 11px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.55',
  background: 'color-mix(in srgb, var(--surface-muted) 74%, transparent)',
  borderLeft: '2px solid color-mix(in srgb, var(--accent) 52%, transparent)',
  borderRadius: '4px 9px 9px 4px',
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

const dnPlanCommissionPanel = style({
  display: 'grid',
  gap: '11px',
  padding: '13px',
  background: 'color-mix(in srgb, var(--surface-elevated) 56%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
})

const dnPlanCommissionHeading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
})

const dnPlanCommissionCopy = style({
  minWidth: '0',
  display: 'grid',
  gap: '3px',
})

const dnPlanCommissionLabel = style({
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontWeight: '800',
})

const dnPlanCommissionMeta = style({
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const dnPlanCommissionCount = style({
  color: 'var(--accent)',
  fontSize: '28px',
  fontWeight: '900',
  lineHeight: '1',
  letterSpacing: '-0.04em',
})

const dnPlanCommissionTotal = style({
  marginLeft: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0',
})

const dnPlanCounterActions = style({
  display: 'grid',
  gridTemplateColumns: '28px minmax(0, 1fr) 28px',
  alignItems: 'center',
  gap: '8px',
})

const dnPlanCounterCopy = style({
  overflow: 'hidden',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  fontWeight: '700',
  textAlign: 'center',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const dnPlanWeeklySection = style({
  display: 'grid',
  gap: '9px',
})

const dnPlanWeeklyHeading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
})

const dnPlanWeeklyCopy = style({
  minWidth: '0',
  display: 'grid',
  gap: '2px',
})

const dnPlanWeeklyTitle = style({
  fontSize: '11px',
  fontWeight: '800',
})

const dnPlanWeeklyMeta = style({
  color: 'var(--text-tertiary)',
  fontSize: '10px',
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

const dnPlanFlags = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '6px',
  },
  {
    '@container': {
      'dn-page (max-width: 410px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const dnPlanFlag = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '8px',
  background: 'color-mix(in srgb, var(--surface-muted) 76%, transparent)',
  border: '1px solid transparent',
  borderRadius: '10px',
  transition: 'background-color 140ms ease, border-color 140ms ease',
  selectors: {
    "&[data-completed='true']": {
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

const dnPlanFlagCopy = style({
  minWidth: '0',
  display: 'grid',
  gap: '2px',
})

const dnPlanFlagTitle = style({
  overflow: 'hidden',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  fontWeight: '800',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const dnPlanFlagStatus = style({
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

const dnPlanActions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  paddingTop: '11px',
  borderTop: '1px solid var(--border-subtle)',
})

const dnPlanSort = style({
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

const dnPlanActionButtons = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '3px',
})

const dnEditorSwitches = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
    gap: '8px',
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

const dnPlanCountEditor = style({
  display: 'grid',
  gridTemplateColumns: '28px minmax(0, 1fr) 28px',
  alignItems: 'center',
  gap: '12px',
  padding: '14px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
})

const dnPlanCountValue = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: '5px',
})

const dnPlanCountNumber = style({
  color: 'var(--accent)',
  fontSize: '28px',
  fontWeight: '900',
  lineHeight: '1',
})

const dnPlanCountUnit = style({
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const dnPlanCountScale = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

const dnEmptyAction = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: '-56px',
  paddingBottom: '20px',
})

const siteMessageList = style({
  display: 'grid',
  gap: '8px',
})

const siteMessageItem = style([
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
    [`${siteMessageItem}&`]: {
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
    },
  },
})

const siteMessageIcon = style({
  width: '38px',
  height: '38px',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
})

const isInfo = style({
  selectors: {
    [`${siteMessageIcon}&`]: {
      color: '#57beff',
      background: 'rgba(87, 190, 255, 0.12)',
    },
  },
})

const isSuccess = style({
  selectors: {
    [`${siteMessageIcon}&`]: {
      color: '#26c876',
      background: 'rgba(24, 183, 104, 0.12)',
    },
  },
})

const isWarning = style({
  selectors: {
    [`${siteMessageIcon}&`]: {
      color: '#e7a72f',
      background: 'rgba(231, 167, 47, 0.12)',
    },
  },
})

const isError = style({
  selectors: {
    [`${siteMessageIcon}&`]: {
      color: 'var(--danger-text)',
      background: 'var(--danger-background)',
    },
  },
})

const siteMessageTitle = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: '800',
})

const siteMessageContent = style({
  display: 'block',
  overflow: 'hidden',
  marginTop: '5px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.55',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '2',
})

const siteMessageActions = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
  },
  {
    '@container': {
      'dn-page (max-width: 620px)': {
        gridColumn: '1 / -1',
        width: '100%',
      },
    },
  },
])

const siteMessageDialogCopy = style({
  margin: '0',
  color: 'var(--text-secondary)',
  lineHeight: '1.75',
  whiteSpace: 'pre-wrap',
})

const siteMessageCenterTrigger = style({
  position: 'relative',
  minWidth: '30px',
  padding: '0',
})

const siteMessageCenterIndicator = style({
  position: 'absolute',
  top: '5px',
  right: '5px',
  width: '6px',
  height: '6px',
  background: '#d84d45',
  borderRadius: '50%',
  boxShadow: '0 0 0 1.5px var(--titlebar-background)',
})

const siteMessageCenterHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  paddingRight: '34px',
})

const siteMessageCenterBody = style({
  padding: '0',
})

const siteMessageCenterList = style({
  maxHeight: 'min(52vh, 430px)',
  display: 'grid',
  gap: '3px',
  overflow: 'auto',
  padding: '8px',
})

const siteMessageCenterItem = style({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '10px',
  padding: '0 10px',
  textAlign: 'left',
})

const siteMessageCenterFooter = style({
  justifyContent: 'space-between',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const siteMessagePopupContent = style({
  margin: '0',
  maxWidth: '760px',
  color: 'var(--text-primary)',
  fontSize: 'clamp(18px, 2.4vw, 28px)',
  lineHeight: '1.8',
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
})

const siteMessagePopupHeader = style({
  padding: 'clamp(24px, 5vh, 56px) clamp(24px, 6vw, 80px) 20px',
  textAlign: 'center',
  borderBottom: '0',
})

const siteMessagePopupTitle = style({
  fontSize: 'clamp(28px, 4.5vw, 52px)',
  letterSpacing: '-0.035em',
})

const siteMessagePopupBody = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: '28px',
  padding: 'clamp(24px, 6vw, 88px)',
  background:
    'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-muted) 88%, transparent), transparent 48%)',
})

const siteMessagePopupLevel = style({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '30px',
  padding: '0 12px',
  color: 'var(--accent)',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  background: 'var(--accent-muted)',
  borderRadius: '999px',
})

const siteMessagePopupFooter = style({
  justifyContent: 'center',
  padding: '20px clamp(24px, 6vw, 80px) clamp(24px, 5vh, 48px)',
})

export const styles = {
  'dn-page': dnPage,
  'dn-card-heading-row': dnCardHeadingRow,
  'dn-card-header-copy': dnCardHeaderCopy,
  'dn-filter-grid': dnFilterGrid,
  'dn-role-filter-grid': dnRoleFilterGrid,
  'dn-weekly-filter-grid': dnWeeklyFilterGrid,
  'site-message-filters': siteMessageFilters,
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
  'dn-plan-card-header': dnPlanCardHeader,
  'dn-plan-avatar': dnPlanAvatar,
  'dn-plan-identity': dnPlanIdentity,
  'dn-plan-role-name': dnPlanRoleName,
  'dn-plan-profession': dnPlanProfession,
  'is-updating': isUpdating,
  'dn-role-stats': dnRoleStats,
  'dn-plan-remark': dnPlanRemark,
  'dn-form-grid': dnFormGrid,
  'dn-form-full': dnFormFull,
  'dn-alert': dnAlert,
  'dn-alert-warning': dnAlertWarning,
  'dn-plan-commission-panel': dnPlanCommissionPanel,
  'dn-plan-commission-heading': dnPlanCommissionHeading,
  'dn-plan-commission-copy': dnPlanCommissionCopy,
  'dn-plan-commission-label': dnPlanCommissionLabel,
  'dn-plan-commission-meta': dnPlanCommissionMeta,
  'dn-plan-commission-count': dnPlanCommissionCount,
  'dn-plan-commission-total': dnPlanCommissionTotal,
  'dn-plan-counter-actions': dnPlanCounterActions,
  'dn-plan-counter-copy': dnPlanCounterCopy,
  'dn-plan-weekly-section': dnPlanWeeklySection,
  'dn-plan-weekly-heading': dnPlanWeeklyHeading,
  'dn-plan-weekly-copy': dnPlanWeeklyCopy,
  'dn-plan-weekly-title': dnPlanWeeklyTitle,
  'dn-plan-weekly-meta': dnPlanWeeklyMeta,
  'dn-section-heading': dnSectionHeading,
  'dn-plan-flags': dnPlanFlags,
  'dn-plan-flag': dnPlanFlag,
  'dn-plan-flag-copy': dnPlanFlagCopy,
  'dn-plan-flag-title': dnPlanFlagTitle,
  'dn-plan-flag-status': dnPlanFlagStatus,
  'dn-plan-actions': dnPlanActions,
  'dn-plan-sort': dnPlanSort,
  'dn-plan-action-buttons': dnPlanActionButtons,
  'dn-editor-switches': dnEditorSwitches,
  'dn-switch-row': dnSwitchRow,
  'dn-plan-editor': dnPlanEditor,
  'dn-plan-count-editor': dnPlanCountEditor,
  'dn-plan-count-value': dnPlanCountValue,
  'dn-plan-count-number': dnPlanCountNumber,
  'dn-plan-count-unit': dnPlanCountUnit,
  'dn-plan-count-scale': dnPlanCountScale,
  'dn-empty-action': dnEmptyAction,
  'site-message-list': siteMessageList,
  'site-message-item': siteMessageItem,
  'is-unread': isUnread,
  'site-message-icon': siteMessageIcon,
  'is-info': isInfo,
  'is-success': isSuccess,
  'is-warning': isWarning,
  'is-error': isError,
  'site-message-title': siteMessageTitle,
  'site-message-content': siteMessageContent,
  'site-message-actions': siteMessageActions,
  'site-message-dialog-copy': siteMessageDialogCopy,
  'site-message-center-trigger': siteMessageCenterTrigger,
  'site-message-center-indicator': siteMessageCenterIndicator,
  'site-message-center-header': siteMessageCenterHeader,
  'site-message-center-body': siteMessageCenterBody,
  'site-message-center-list': siteMessageCenterList,
  'site-message-center-item': siteMessageCenterItem,
  'site-message-center-footer': siteMessageCenterFooter,
  'site-message-popup-content': siteMessagePopupContent,
  'site-message-popup-header': siteMessagePopupHeader,
  'site-message-popup-title': siteMessagePopupTitle,
  'site-message-popup-body': siteMessagePopupBody,
  'site-message-popup-level': siteMessagePopupLevel,
  'site-message-popup-footer': siteMessagePopupFooter,
} as const

globalStyle(`${dnPage} p`, {
  overflowWrap: 'anywhere',
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

globalStyle(
  `${dnPlanCounterActions} ${buttonStyles.root},
${dnPlanCountEditor} ${buttonStyles.root}`,
  {
    width: 'var(--button-height-sm)',
    padding: '0',
  },
)

globalStyle(`${dnEditorSwitches} label`, {
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

globalStyle(`${dnPlanEditor} > section`, {
  display: 'grid',
  gap: '10px',
})

globalStyle(`${siteMessageItem} > span:nth-child(2)`, {
  minWidth: '0',
})

globalStyle(`${siteMessageIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${siteMessageItem} small`, {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: '11px',
})

globalStyle(`${siteMessageItem} small`, {
  marginTop: '7px',
  color: 'var(--text-tertiary)',
})

globalStyle(`${siteMessageActions} ${buttonStyles.root}:first-child`, {
  maxWidth: '160px',
})

globalStyle(`${siteMessageActions} ${buttonStyles.root}:not(:first-child)`, {
  width: 'var(--button-height-default)',
  padding: '0',
})

globalStyle(`${siteMessageCenterTrigger} > svg`, {
  width: '16px',
  height: '16px',
})

globalStyle(`${siteMessageCenterItem} > span:nth-child(2)`, {
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

globalStyle(
  `${siteMessageCenterItem} strong,
${siteMessageCenterItem} time`,
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
)

globalStyle(`${siteMessageCenterItem} strong`, {
  minWidth: '0',
  flex: '1',
  fontSize: '12px',
  whiteSpace: 'nowrap',
})

globalStyle(`${siteMessageCenterItem} time`, {
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  whiteSpace: 'nowrap',
})

globalStyle(`${siteMessageCenterItem} > svg`, {
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

globalStyle(`${dnFilterActions} ${buttonStyles.root}`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      flex: '1',
    },
  },
})

globalStyle(`${siteMessageActions} ${buttonStyles.root}:first-child`, {
  '@container': {
    'dn-page (max-width: 620px)': {
      maxWidth: 'none',
      flex: '1',
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
