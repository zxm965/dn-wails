import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const uiSkeletonKeyframes = keyframes({
  to: {
    backgroundPosition: '-200% 0',
  },
})

const uiPageHeader = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
  },
  {
    '@container': {
      'app-content (max-width: 620px)': {
        flexDirection: 'column',
      },
    },
  },
])

const uiPageHeaderActions = style([
  {
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

globalStyle(`${uiPageHeader} h1`, {
  fontSize: 'clamp(23px, 3.5vw, 32px)',
})

globalStyle(`${uiPageHeader} p`, {
  marginTop: '6px',
  color: 'var(--text-secondary)',
  fontSize: '13px',
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
