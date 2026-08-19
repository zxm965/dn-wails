import { globalStyle, style } from '@vanilla-extract/css'

const desktopOverview = style({
  width: 'min(var(--page-content-max-width), 100%)',
  display: 'grid',
  gap: '14px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'desktop-overview',
  containerType: 'inline-size',
})

const isEmbedded = style({
  width: '100%',
  margin: '0',
  padding: '0',
})

const overviewHeading = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '4px',
    padding: '0 2px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: '12px',
      },
    },
  },
])

const overviewEyebrow = style({
  margin: '0 0 6px',
  color: 'var(--accent)',
  fontSize: '10px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

const overviewTitle = style({
  margin: '0',
  fontSize: '18px',
  letterSpacing: '-0.02em',
})

const overviewDescription = style({
  display: 'block',
  marginTop: '5px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

const overviewTag = style({
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '30px',
  padding: '0 11px',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  background: 'color-mix(in srgb, var(--accent-muted) 72%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border-subtle))',
  borderRadius: '999px',
})

const overviewTopGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(250px, 0.8fr)',
    gap: '12px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 760px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const overviewProductCard = style({
  position: 'relative',
  minWidth: '0',
  minHeight: '190px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '22px',
  padding: '22px',
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
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

const overviewProductName = style({
  margin: '5px 0 0',
  overflow: 'hidden',
  fontSize: 'clamp(20px, 3vw, 27px)',
  letterSpacing: '-0.035em',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const overviewProductAuthor = style({
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '10px',
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
  fontSize: '9px',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '9px',
})

const overviewUpdateCard = style({
  minWidth: '0',
  minHeight: '190px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '20px',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-muted) 58%, var(--surface-elevated)), var(--surface-elevated))',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
  selectors: {
    '&[data-state="available"]': {
      background:
        'linear-gradient(145deg, color-mix(in srgb, var(--accent-muted) 78%, var(--surface-elevated)), var(--surface-elevated))',
      borderColor: 'color-mix(in srgb, var(--accent) 26%, var(--border-subtle))',
    },
  },
})

const overviewUpdateHeading = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
})

const overviewUpdateIcon = style({
  width: '34px',
  height: '34px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 78%, transparent)',
  borderRadius: '10px',
})

const overviewUpdateTitle = style({
  margin: '0',
  overflow: 'hidden',
  fontSize: '17px',
  letterSpacing: '-0.02em',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const overviewUpdateDescription = style({
  minHeight: '30px',
  margin: '6px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  lineHeight: '1.55',
})

const overviewUpdateMeta = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
})

const overviewPolicyGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 790px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const overviewPolicyCard = style({
  minWidth: '0',
  display: 'grid',
  gap: '15px',
  padding: '17px',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 97%, var(--accent) 3%), var(--surface-elevated))',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: 'var(--surface-shadow)',
})

const overviewPolicyHeading = style({
  display: 'grid',
  gridTemplateColumns: '36px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '10px',
})

const overviewPolicyIcon = style({
  width: '36px',
  height: '36px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 76%, transparent)',
  borderRadius: '10px',
})

const overviewPolicyValue = style({
  overflow: 'hidden',
  fontSize: '14px',
  letterSpacing: '-0.01em',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const overviewPolicyDetails = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
})

const overviewFeatureSection = style({
  minWidth: '0',
  display: 'grid',
  gap: '14px',
  padding: '18px',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const overviewFeatureHeading = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 480px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const overviewFeatureTitle = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '38px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '11px',
})

const overviewFeatureHeadingIcon = style({
  width: '38px',
  height: '38px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 76%, transparent)',
  borderRadius: '11px',
})

const overviewFeatureCount = style({
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '28px',
  padding: '0 9px',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  background: 'color-mix(in srgb, var(--accent-muted) 66%, transparent)',
  borderRadius: '999px',
})

const overviewFeatureGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: '8px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 880px)': {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      },
      'desktop-overview (max-width: 560px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
      'desktop-overview (max-width: 360px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const overviewFeatureItem = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '32px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '9px',
  padding: '10px',
  background: 'color-mix(in srgb, var(--surface-muted) 68%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 12%, var(--border-subtle))',
  borderRadius: '11px',
})

const isDisabled = style({
  opacity: '0.62',
  filter: 'saturate(0.3)',
})

const overviewFeatureIcon = style({
  width: '32px',
  height: '32px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 72%, transparent)',
  borderRadius: '9px',
})

const overviewFeatureCopy = style({
  minWidth: '0',
})

const overviewFeatureState = style({
  gridColumn: '1 / -1',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  selectors: {
    [`${overviewFeatureItem}${isDisabled} &`]: {
      color: 'var(--text-tertiary)',
    },
  },
})

export const styles = {
  'desktop-overview': desktopOverview,
  'is-embedded': isEmbedded,
  'overview-heading': overviewHeading,
  'overview-eyebrow': overviewEyebrow,
  'overview-title': overviewTitle,
  'overview-description': overviewDescription,
  'overview-tag': overviewTag,
  'overview-top-grid': overviewTopGrid,
  'overview-product-card': overviewProductCard,
  'overview-product-identity': overviewProductIdentity,
  'overview-product-icon': overviewProductIcon,
  'overview-card-eyebrow': overviewCardEyebrow,
  'overview-product-name': overviewProductName,
  'overview-product-author': overviewProductAuthor,
  'overview-build-meta': overviewBuildMeta,
  'overview-meta-item': overviewMetaItem,
  'overview-update-card': overviewUpdateCard,
  'overview-update-heading': overviewUpdateHeading,
  'overview-update-icon': overviewUpdateIcon,
  'overview-update-title': overviewUpdateTitle,
  'overview-update-description': overviewUpdateDescription,
  'overview-update-meta': overviewUpdateMeta,
  'overview-policy-grid': overviewPolicyGrid,
  'overview-policy-card': overviewPolicyCard,
  'overview-policy-heading': overviewPolicyHeading,
  'overview-policy-icon': overviewPolicyIcon,
  'overview-policy-value': overviewPolicyValue,
  'overview-policy-details': overviewPolicyDetails,
  'overview-feature-section': overviewFeatureSection,
  'overview-feature-heading': overviewFeatureHeading,
  'overview-feature-title': overviewFeatureTitle,
  'overview-feature-heading-icon': overviewFeatureHeadingIcon,
  'overview-feature-count': overviewFeatureCount,
  'overview-feature-grid': overviewFeatureGrid,
  'overview-feature-item': overviewFeatureItem,
  'is-disabled': isDisabled,
  'overview-feature-icon': overviewFeatureIcon,
  'overview-feature-copy': overviewFeatureCopy,
  'overview-feature-state': overviewFeatureState,
} as const

globalStyle(`${overviewMetaItem} svg`, {
  width: '12px',
  height: '12px',
  flex: '0 0 auto',
})

globalStyle(`${overviewUpdateIcon} svg`, {
  width: '17px',
  height: '17px',
})

globalStyle(`${overviewUpdateMeta} span`, {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '24px',
  padding: '0 8px',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  fontWeight: '700',
  background: 'color-mix(in srgb, var(--surface-muted) 78%, transparent)',
  borderRadius: '7px',
})

globalStyle(`${overviewPolicyIcon} svg`, {
  width: '17px',
  height: '17px',
})

globalStyle(`${overviewPolicyHeading} h3`, {
  margin: '4px 0 0',
  fontSize: '12px',
})

globalStyle(`${overviewPolicyDetails} span`, {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '24px',
  padding: '0 8px',
  color: 'var(--text-secondary)',
  fontSize: '8px',
  background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
  borderRadius: '7px',
})

globalStyle(`${overviewFeatureHeadingIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${overviewFeatureTitle} h3`, {
  margin: '4px 0 0',
  fontSize: '13px',
})

globalStyle(`${overviewFeatureIcon} svg`, {
  width: '15px',
  height: '15px',
})

globalStyle(`${overviewFeatureCopy} strong`, {
  display: 'block',
  overflow: 'hidden',
  fontSize: '10px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${overviewFeatureCopy} small`, {
  display: 'block',
  overflow: 'hidden',
  marginTop: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})
