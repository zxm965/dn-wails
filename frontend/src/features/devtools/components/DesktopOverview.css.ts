import { globalStyle, style } from '@vanilla-extract/css'

const desktopOverview = style({
  width: 'min(var(--page-content-max-width), 100%)',
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

const desktopOverviewHeading = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '18px',
    padding: '0 2px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const desktopOverviewReady = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minHeight: '34px',
  padding: '0 12px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  background: 'color-mix(in srgb, var(--surface-muted) 80%, transparent)',
  border: '1px solid var(--border-strong)',
  borderRadius: '999px',
  '@container': {
    'desktop-overview (max-width: 520px)': {
      alignSelf: 'flex-start',
    },
  },
})

const isReady = style({
  selectors: {
    [`${desktopOverviewReady} > span&`]: {
      background: '#18b768',
      boxShadow: '0 0 0 4px rgba(24, 183, 104, 0.13)',
    },
  },
})

const isError = style({
  selectors: {
    [`${desktopOverviewReady} > span&`]: {
      background: 'var(--danger-text)',
      boxShadow: '0 0 0 4px var(--danger-background)',
    },
  },
})

const desktopOverviewSummary = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '12px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 820px)': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  {
    '@container': {
      'desktop-overview (max-width: 400px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

export const styles = {
  'desktop-overview': desktopOverview,
  'is-embedded': isEmbedded,
  'desktop-overview-heading': desktopOverviewHeading,
  'desktop-overview-ready': desktopOverviewReady,
  'is-ready': isReady,
  'is-error': isError,
  'desktop-overview-summary': desktopOverviewSummary,
} as const

globalStyle(`${desktopOverviewHeading} > div:first-child`, {
  minWidth: '0',
})

globalStyle(`${desktopOverviewHeading} p`, {
  margin: '0 0 8px',
  color: 'var(--accent)',
  fontSize: '11px',
  fontWeight: '800',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
})

globalStyle(`${desktopOverviewHeading} h1`, {
  margin: '0',
  fontSize: 'clamp(28px, 4vw, 38px)',
})

globalStyle(`${desktopOverviewHeading} h2`, {
  margin: '0',
  fontSize: '18px',
})

globalStyle(`${desktopOverviewHeading} div > span`, {
  display: 'block',
  color: 'var(--text-secondary)',
})

globalStyle(`${desktopOverviewReady} > span`, {
  width: '8px',
  height: '8px',
  margin: '0',
  background: 'var(--text-tertiary)',
  borderRadius: '50%',
})

globalStyle(`${desktopOverviewSummary} article`, {
  position: 'relative',
  minWidth: '0',
  overflow: 'hidden',
  padding: '17px',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 96%, var(--accent) 4%), var(--surface-elevated))',
  border: '1px solid var(--border-subtle)',
  borderRadius: '13px',
  boxShadow: 'var(--surface-shadow)',
})

globalStyle(`${desktopOverviewSummary} article::before`, {
  position: 'absolute',
  top: '0',
  left: '17px',
  width: '28px',
  height: '2px',
  content: '""',
  background: 'var(--accent)',
  borderRadius: '0 0 999px 999px',
})

globalStyle(
  `${desktopOverviewSummary} span,
${desktopOverviewSummary} strong,
${desktopOverviewSummary} small`,
  {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
)

globalStyle(`${desktopOverviewSummary} span`, {
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  fontWeight: '700',
  letterSpacing: '0.06em',
})

globalStyle(`${desktopOverviewSummary} strong`, {
  marginTop: '11px',
  fontSize: '17px',
  letterSpacing: '-0.02em',
})

globalStyle(`${desktopOverviewSummary} small`, {
  marginTop: '6px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
})

globalStyle(`${desktopOverviewHeading} h1`, {
  '@container': {
    'desktop-overview (max-width: 520px)': {
      fontSize: 'clamp(26px, 9vw, 34px)',
    },
  },
})

globalStyle(`${desktopOverviewSummary} article`, {
  '@container': {
    'desktop-overview (max-width: 400px)': {
      padding: '16px',
    },
  },
})
