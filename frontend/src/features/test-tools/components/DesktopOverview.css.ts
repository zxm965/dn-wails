import { globalStyle, style } from '@vanilla-extract/css'

const desktopOverview = style({
  width: 'min(1080px, 100%)',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '28px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
        flexDirection: 'column',
      },
    },
  },
])

const desktopOverviewSectionHeading = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
    marginBottom: '20px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
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
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
  boxShadow: 'var(--surface-shadow)',
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

const desktopOverviewSection = style({
  marginTop: '18px',
  padding: 'var(--panel-padding)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const desktopOverviewCapabilities = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '14px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 680px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const desktopOverviewCapabilityIndex = style({
  color: 'var(--accent)',
  fontSize: '10px',
  fontWeight: '800',
})

const desktopOverviewRuntime = style({})

const desktopOverviewUpdateContent = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },
  {
    '@container': {
      'desktop-overview (max-width: 520px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const desktopOverviewError = style({
  margin: '14px 0 0',
  color: 'var(--danger-text)',
  fontSize: '11px',
})

export const styles = {
  'desktop-overview': desktopOverview,
  'is-embedded': isEmbedded,
  'desktop-overview-heading': desktopOverviewHeading,
  'desktop-overview-section-heading': desktopOverviewSectionHeading,
  'desktop-overview-ready': desktopOverviewReady,
  'is-ready': isReady,
  'is-error': isError,
  'desktop-overview-summary': desktopOverviewSummary,
  'desktop-overview-section': desktopOverviewSection,
  'desktop-overview-capabilities': desktopOverviewCapabilities,
  'desktop-overview-capability-index': desktopOverviewCapabilityIndex,
  'desktop-overview-runtime': desktopOverviewRuntime,
  'desktop-overview-update-content': desktopOverviewUpdateContent,
  'desktop-overview-error': desktopOverviewError,
} as const

globalStyle(
  `${desktopOverviewHeading} > div:first-child,
${desktopOverviewSectionHeading} > div:first-child`,
  {
    minWidth: '0',
  },
)

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
  minWidth: '0',
  padding: '18px',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '13px',
  boxShadow: 'var(--surface-shadow)',
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
  fontSize: '10px',
  fontWeight: '700',
})

globalStyle(`${desktopOverviewSummary} strong`, {
  marginTop: '12px',
  fontSize: '17px',
})

globalStyle(`${desktopOverviewSummary} small`, {
  marginTop: '6px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
})

globalStyle(`${desktopOverviewSectionHeading} h2`, {
  margin: '0',
  fontSize: '16px',
})

globalStyle(`${desktopOverviewSectionHeading} p`, {
  margin: '6px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  lineHeight: '1.55',
})

globalStyle(`${desktopOverviewSectionHeading} > span`, {
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
})

globalStyle(`${desktopOverviewCapabilities} article`, {
  minWidth: '0',
  padding: '18px',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '12px',
})

globalStyle(`${desktopOverviewCapabilities} h3`, {
  margin: '12px 0 0',
  fontSize: '14px',
})

globalStyle(`${desktopOverviewCapabilities} article > p`, {
  minHeight: '34px',
  margin: '7px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.5',
})

globalStyle(`${desktopOverviewCapabilities} ul`, {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  margin: '16px 0 0',
  padding: '14px 0 0',
  borderTop: '1px solid var(--border-subtle)',
  listStyle: 'none',
})

globalStyle(`${desktopOverviewCapabilities} li`, {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
})

globalStyle(`${desktopOverviewCapabilities} li span`, {
  width: '5px',
  height: '5px',
  flex: '0 0 auto',
  background: 'var(--accent)',
  borderRadius: '50%',
})

globalStyle(`${desktopOverviewRuntime} dl`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0 24px',
  margin: '0',
})

globalStyle(`${desktopOverviewUpdateContent} > div`, {
  minWidth: '0',
})

globalStyle(
  `${desktopOverviewUpdateContent} strong,
${desktopOverviewUpdateContent} small`,
  {
    display: 'block',
  },
)

globalStyle(`${desktopOverviewUpdateContent} strong`, {
  fontSize: '14px',
})

globalStyle(`${desktopOverviewUpdateContent} small`, {
  marginTop: '7px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  overflowWrap: 'anywhere',
})

globalStyle(`${desktopOverviewUpdateContent} button`, {
  flex: '0 0 auto',
})

globalStyle(`${desktopOverviewUpdateContent} button`, {
  '@container': {
    'desktop-overview (max-width: 520px)': {
      width: '100%',
    },
  },
})

globalStyle(`${desktopOverviewRuntime} dl > div`, {
  minWidth: '0',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '11px 0',
  borderBottom: '1px solid var(--border-subtle)',
})

globalStyle(`${desktopOverviewRuntime} dt`, {
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

globalStyle(`${desktopOverviewRuntime} dd`, {
  minWidth: '0',
  overflow: 'hidden',
  margin: '0',
  fontSize: '11px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${desktopOverviewRuntime} dl`, {
  '@container': {
    'desktop-overview (max-width: 680px)': {
      gridTemplateColumns: '1fr',
    },
  },
})

globalStyle(`${desktopOverviewSectionHeading} > span`, {
  '@container': {
    'desktop-overview (max-width: 520px)': {
      alignSelf: 'flex-start',
    },
  },
})

globalStyle(`${desktopOverviewHeading} h1`, {
  '@container': {
    'desktop-overview (max-width: 520px)': {
      fontSize: 'clamp(26px, 9vw, 34px)',
    },
  },
})

globalStyle(
  `${desktopOverviewSummary} article,
  ${desktopOverviewCapabilities} article`,
  {
    '@container': {
      'desktop-overview (max-width: 400px)': {
        padding: '16px',
      },
    },
  },
)

globalStyle(`${desktopOverviewRuntime} dl > div`, {
  '@container': {
    'desktop-overview (max-width: 400px)': {
      alignItems: 'flex-start',
      flexDirection: 'column',
      gap: '5px',
    },
  },
})

globalStyle(`${desktopOverviewRuntime} dd`, {
  '@container': {
    'desktop-overview (max-width: 400px)': {
      width: '100%',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
    },
  },
})
