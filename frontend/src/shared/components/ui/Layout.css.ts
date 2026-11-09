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
    gap: 'calc(20px * var(--layout-spacing))',
    overflow: 'hidden',
    minHeight: 'calc(76px * var(--layout-spacing))',
    padding: 'calc(12px * var(--layout-spacing)) calc(18px * var(--layout-spacing))',
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

const pageHeaderCopy = style({ position: 'relative', zIndex: 1, minWidth: 0 })
const pageHeaderTitle = style({
  margin: 0,
  color: 'var(--accent)',
  fontSize: 'var(--font-size-caption)',
  fontWeight: 800,
  letterSpacing: '0.08em',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})
const pageHeaderDescription = style({
  margin: '5px 0 0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
})

const uiPageHeaderActions = style([
  {
    position: 'relative',
    zIndex: '1',
    display: 'flex',
    alignItems: 'center',
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
    fontSize: 'var(--font-size-secondary)',
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
  fontSize: 'var(--font-size-body)',
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
  pageHeaderCopy,
  pageHeaderTitle,
  pageHeaderDescription,
  'ui-page-header-actions': uiPageHeaderActions,
  'ui-pagination': uiPagination,
  'ui-list-state': uiListState,
  'ui-skeleton': uiSkeleton,
} as const

globalStyle(`${uiPagination} > div`, {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
})

globalStyle(`${uiListState} svg`, {
  width: '26px',
  height: '26px',
})
