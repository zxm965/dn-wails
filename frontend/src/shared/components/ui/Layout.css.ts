import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const uiSkeletonKeyframes = keyframes({
  to: {
    backgroundPosition: '-200% 0',
  },
})

const uiPageHeader = style([
  {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    overflow: 'hidden',
    padding: 'clamp(17px, 2.4vw, 22px)',
    background:
      'radial-gradient(circle at 14% 0%, var(--accent-muted), transparent 34%), linear-gradient(135deg, var(--surface-elevated), color-mix(in srgb, var(--surface-elevated) 90%, var(--accent) 10%))',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
    selectors: {
      '&::after': {
        position: 'absolute',
        top: '-52px',
        right: '-18px',
        width: '132px',
        height: '132px',
        content: '""',
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        borderRadius: '50%',
        boxShadow: '0 0 0 22px color-mix(in srgb, var(--accent) 4%, transparent)',
        pointerEvents: 'none',
      },
    },
  },
  {
    '@container': {
      'app-content (max-width: 620px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const uiPageHeaderEyebrow = style({
  display: 'block',
  marginBottom: '6px',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
})

const uiPageHeaderActions = style([
  {
    position: 'relative',
    zIndex: '1',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  {
    '@container': {
      'app-content (max-width: 620px)': {
        width: '100%',
        justifyContent: 'flex-start',
      },
    },
  },
])

const uiPagination = style([
  {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  {
    '@media': {
      '(max-width: 560px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const uiListState = style({
  minHeight: '180px',
  display: 'grid',
  placeContent: 'center',
  justifyItems: 'center',
  gap: '10px',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  textAlign: 'center',
})

const uiSkeleton = style([
  {
    minHeight: '20px',
    background: 'linear-gradient(90deg, var(--surface-muted), var(--surface-hover), var(--surface-muted))',
    backgroundSize: '200% 100%',
    borderRadius: '8px',
    animation: `${uiSkeletonKeyframes} 1.4s ease infinite`,
  },
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        animation: 'none',
      },
    },
  },
])

export const styles = {
  'ui-page-header': uiPageHeader,
  'ui-page-header-eyebrow': uiPageHeaderEyebrow,
  'ui-page-header-actions': uiPageHeaderActions,
  'ui-pagination': uiPagination,
  'ui-list-state': uiListState,
  'ui-skeleton': uiSkeleton,
} as const

globalStyle(
  `${uiPageHeader} h1,
${uiPageHeader} p`,
  {
    margin: '0',
  },
)

globalStyle(`${uiPageHeader} > div:first-child`, {
  position: 'relative',
  zIndex: '1',
  minWidth: '0',
})

globalStyle(`${uiPageHeader} h1`, {
  fontSize: 'clamp(23px, 3.2vw, 31px)',
  letterSpacing: '-0.025em',
  lineHeight: '1.08',
})

globalStyle(`${uiPageHeader} p`, {
  marginTop: '7px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.5',
})

globalStyle(`${uiPagination} > div`, {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
})

globalStyle(`${uiListState} svg`, {
  width: '26px',
  height: '26px',
})
