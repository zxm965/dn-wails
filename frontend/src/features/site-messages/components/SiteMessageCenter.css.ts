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
  gap: 'calc(3px * var(--layout-spacing))',
  overflow: 'auto',
  padding: 'calc(8px * var(--layout-spacing))',
})

const centerItem = style({
  width: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 'calc(10px * var(--layout-spacing))',
  padding: '0 calc(10px * var(--layout-spacing))',
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
  fontSize: 'var(--font-size-secondary)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const centerItemTime = style({
  flex: '0 0 auto',
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
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
  fontSize: 'var(--font-size-caption)',
})

const popupContent = style({
  margin: '0',
  maxWidth: '760px',
  color: 'var(--text-primary)',
  fontSize:
    'clamp(var(--font-size-title), calc(2.4vw + var(--font-size-heading-offset)), calc(28px + var(--font-size-heading-offset)))',
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
  fontSize:
    'clamp(calc(28px + var(--font-size-heading-offset)), calc(4.5vw + var(--font-size-heading-offset)), calc(52px + var(--font-size-heading-offset)))',
  letterSpacing: '-0.035em',
})

const popupBody = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 'calc(28px * var(--layout-spacing))',
  padding: 'calc(clamp(24px, 6vw, 88px) * var(--layout-spacing))',
  background:
    'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-muted) 88%, transparent), transparent 48%)',
})

const popupLevel = style({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '30px',
  padding: '0 12px',
  color: 'var(--accent)',
  fontSize: 'var(--font-size-secondary)',
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
  padding: 'calc(16px * var(--layout-spacing))',
  background: 'var(--surface-muted)',
})

const batchList = style({
  display: 'grid',
  gap: 'calc(12px * var(--layout-spacing))',
})

const batchItem = style({
  minWidth: '0',
  display: 'grid',
  gap: 'calc(10px * var(--layout-spacing))',
  padding: 'calc(16px * var(--layout-spacing))',
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
  fontSize: 'var(--font-size-caption)',
})

const batchItemTitle = style({
  margin: '0',
  overflowWrap: 'anywhere',
  fontSize: 'var(--font-size-subtitle)',
})

const batchItemContent = style({
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
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
  fontSize: 'var(--font-size-secondary)',
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
