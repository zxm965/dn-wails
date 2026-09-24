import { style } from '@vanilla-extract/css'

const centerTrigger = style({
  position: 'relative',
  minWidth: '30px',
  padding: '0',
})

const centerTriggerIcon = style({
  width: '16px',
  height: '16px',
})

const centerIndicator = style({
  position: 'absolute',
  top: '5px',
  right: '5px',
  width: '6px',
  height: '6px',
  background: '#d84d45',
  borderRadius: '50%',
  boxShadow: '0 0 0 1.5px var(--titlebar-background)',
})

const centerHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  paddingRight: '34px',
})

const centerBody = style({ padding: '0' })

const centerList = style({
  maxHeight: 'min(52vh, 430px)',
  display: 'grid',
  gap: '3px',
  overflow: 'auto',
  padding: '8px',
})

const centerItem = style({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '10px',
  padding: '0 10px',
  textAlign: 'left',
})

const centerItemCopy = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const centerItemTitle = style({
  minWidth: '0',
  flex: '1',
  overflow: 'hidden',
  fontSize: '12px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const centerItemTime = style({
  flex: '0 0 auto',
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const centerItemExternal = style({
  width: '14px',
  height: '14px',
  color: 'var(--text-tertiary)',
})

const centerFooter = style({
  justifyContent: 'space-between',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const popupContent = style({
  margin: '0',
  maxWidth: '760px',
  color: 'var(--text-primary)',
  fontSize: 'clamp(18px, 2.4vw, 28px)',
  lineHeight: '1.8',
  overflowWrap: 'anywhere',
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
})

const popupHeader = style({
  padding: 'clamp(24px, 5vh, 56px) clamp(24px, 6vw, 80px) 20px',
  textAlign: 'center',
  borderBottom: '0',
})

const popupTitle = style({
  fontSize: 'clamp(28px, 4.5vw, 52px)',
  letterSpacing: '-0.035em',
})

const popupBody = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: '28px',
  padding: 'clamp(24px, 6vw, 88px)',
  background:
    'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-muted) 88%, transparent), transparent 48%)',
})

const popupLevel = style({
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

const popupFooter = style({
  justifyContent: 'center',
  padding: '20px clamp(24px, 6vw, 80px) clamp(24px, 5vh, 48px)',
})

const batchHeader = style({
  paddingRight: '52px',
})

const batchBody = style({
  padding: '16px',
  background: 'var(--surface-muted)',
})

const batchList = style({
  display: 'grid',
  gap: '12px',
})

const batchItem = style({
  minWidth: '0',
  display: 'grid',
  gap: '10px',
  padding: '16px',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
})

const batchItemHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const batchItemTitle = style({
  margin: '0',
  overflowWrap: 'anywhere',
  fontSize: '15px',
})

const batchItemContent = style({
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.7',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
})

const batchItemActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
})

const batchActionButton = style({
  '@media': {
    '(max-width: 560px)': {
      width: '100%',
    },
  },
})

const batchFooter = style({
  alignItems: 'center',
  justifyContent: 'space-between',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const batchFooterActions = style([
  {
    display: 'flex',
    gap: '8px',
  },
  {
    '@media': {
      '(max-width: 560px)': {
        width: '100%',
        flexDirection: 'column',
      },
    },
  },
])

const batchFooterButton = style({
  '@media': {
    '(max-width: 560px)': {
      width: '100%',
    },
  },
})

export const styles = {
  'site-message-center-trigger': centerTrigger,
  'site-message-center-trigger-icon': centerTriggerIcon,
  'site-message-center-indicator': centerIndicator,
  'site-message-center-header': centerHeader,
  'site-message-center-body': centerBody,
  'site-message-center-list': centerList,
  'site-message-center-item': centerItem,
  'site-message-center-item-copy': centerItemCopy,
  'site-message-center-item-title': centerItemTitle,
  'site-message-center-item-time': centerItemTime,
  'site-message-center-item-external': centerItemExternal,
  'site-message-center-footer': centerFooter,
  'site-message-popup-content': popupContent,
  'site-message-popup-header': popupHeader,
  'site-message-popup-title': popupTitle,
  'site-message-popup-body': popupBody,
  'site-message-popup-level': popupLevel,
  'site-message-popup-footer': popupFooter,
  'site-message-batch-header': batchHeader,
  'site-message-batch-body': batchBody,
  'site-message-batch-list': batchList,
  'site-message-batch-item': batchItem,
  'site-message-batch-item-header': batchItemHeader,
  'site-message-batch-item-title': batchItemTitle,
  'site-message-batch-item-content': batchItemContent,
  'site-message-batch-item-actions': batchItemActions,
  'site-message-batch-action-button': batchActionButton,
  'site-message-batch-footer': batchFooter,
  'site-message-batch-footer-actions': batchFooterActions,
  'site-message-batch-footer-button': batchFooterButton,
} as const
