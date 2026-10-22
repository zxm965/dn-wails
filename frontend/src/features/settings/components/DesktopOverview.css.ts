import { globalStyle, style } from '@vanilla-extract/css'

const desktopOverview = style({
  width: '100%',
  minWidth: 0,
  display: 'grid',
  gap: 'calc(14px * var(--layout-spacing))',
  containerName: 'desktop-overview',
  containerType: 'inline-size',
})

const overviewHeading = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'calc(24px * var(--layout-spacing))',
    marginBottom: 'calc(4px * var(--layout-spacing))',
    padding: '0 calc(2px * var(--layout-spacing))',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: 'calc(12px * var(--layout-spacing))',
      },
    },
  },
])

const overviewEyebrow = style({
  margin: '0 0 6px',
  color: 'var(--accent)',
  fontSize: 'var(--font-size-caption)',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

const overviewTitle = style({
  margin: '0',
  fontSize: 'var(--font-size-title)',
  letterSpacing: '-0.02em',
})

const overviewDescription = style({
  display: 'block',
  marginTop: '5px',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-caption)',
  lineHeight: '1.5',
})

const overviewProductCard = style({
  position: 'relative',
  minWidth: '0',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(20px * var(--layout-spacing))',
  padding: 'calc(clamp(14px, 2.5cqi, 22px) * var(--layout-spacing))',
  background:
    'radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--accent-muted) 86%, transparent), transparent 38%), linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated) 94%, var(--accent) 6%), var(--surface-elevated))',
  border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--border-subtle))',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
  selectors: {
    '&::after': {
      position: 'absolute',
      top: '-56px',
      right: '-44px',
      width: '180px',
      height: '180px',
      content: '""',
      background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)',
      pointerEvents: 'none',
    },
  },
})

const overviewProductIdentity = style({
  position: 'relative',
  zIndex: '1',
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '54px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '15px',
})

const overviewProductIcon = style({
  width: '54px',
  height: '54px',
  display: 'block',
  objectFit: 'contain',
  background: 'transparent',
})

const overviewCardEyebrow = style({
  display: 'block',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-micro)',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

const overviewProductName = style({
  margin: '5px 0 0',
  overflow: 'hidden',
  fontSize:
    'clamp(calc(20px + var(--font-size-heading-offset)), calc(3vw + var(--font-size-heading-offset)), calc(27px + var(--font-size-heading-offset)))',
  letterSpacing: '-0.035em',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const overviewProductAuthor = style({
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-caption)',
})

const overviewBuildMeta = style({
  position: 'relative',
  zIndex: '1',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '7px',
})

const overviewMetaItem = style({
  minWidth: '0',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minHeight: '28px',
  padding: '0 9px',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-caption)',
  overflowWrap: 'anywhere',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '9px',
})

const actions = style({ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0, maxWidth: '100%' })
const content = style({
  position: 'relative',
  zIndex: 1,
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
  alignItems: 'center',
  gap: 'calc(24px * var(--layout-spacing))',
  '@container': {
    'desktop-overview (max-width: 760px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: 'calc(20px * var(--layout-spacing))',
    },
  },
})
const details = style({
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'calc(14px * var(--layout-spacing)) calc(20px * var(--layout-spacing))',
  margin: 0,
  '@container': {
    'desktop-overview (max-width: 420px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: 'calc(12px * var(--layout-spacing))',
    },
  },
})
const detail = style({ minWidth: 0 })
const detailLabel = style({ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-caption)', marginBottom: 5 })
const detailValue = style({
  margin: 0,
  fontSize: 'var(--font-size-secondary)',
  fontWeight: 650,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const footer = style({
  position: 'relative',
  zIndex: 1,
  minWidth: 0,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'calc(12px * var(--layout-spacing)) calc(20px * var(--layout-spacing))',
  paddingTop: 'calc(14px * var(--layout-spacing))',
  borderTop: '1px solid var(--border-subtle)',
})
const logActions = style({ minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 })
const checkedAt = style({
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  overflowWrap: 'anywhere',
})
const pending = style({
  margin: 0,
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const error = style({
  margin: 0,
  padding: '10px 12px',
  color: 'var(--danger-text)',
  background: 'var(--danger-background)',
  borderRadius: 8,
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})

export const styles = {
  actions,
  content,
  details,
  detail,
  detailLabel,
  detailValue,
  footer,
  logActions,
  checkedAt,
  pending,
  error,
  'desktop-overview': desktopOverview,
  'overview-heading': overviewHeading,
  'overview-eyebrow': overviewEyebrow,
  'overview-title': overviewTitle,
  'overview-description': overviewDescription,
  'overview-product-card': overviewProductCard,
  'overview-product-identity': overviewProductIdentity,
  'overview-product-icon': overviewProductIcon,
  'overview-card-eyebrow': overviewCardEyebrow,
  'overview-product-name': overviewProductName,
  'overview-product-author': overviewProductAuthor,
  'overview-build-meta': overviewBuildMeta,
  'overview-meta-item': overviewMetaItem,
} as const

globalStyle(`${overviewMetaItem} svg`, {
  width: '12px',
  height: '12px',
  flex: '0 0 auto',
})
