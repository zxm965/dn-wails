import { globalStyle, style } from '@vanilla-extract/css'

const runtimeStatusPanel = style({
  width: '100%',
  display: 'grid',
  gap: '14px',
  containerName: 'runtime-status',
  containerType: 'inline-size',
})

const runtimeStatusHeading = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '0 2px',
  },
  {
    '@container': {
      'runtime-status (max-width: 660px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
      },
    },
  },
])

const runtimeStatusActions = style([
  {
    flex: '0 0 auto',
    display: 'flex',
    gap: '8px',
  },
  {
    '@container': {
      'runtime-status (max-width: 440px)': {
        width: '100%',
        flexDirection: 'column',
      },
    },
  },
])

const runtimeStatusError = style({
  margin: '0',
  padding: '10px 12px',
  color: 'var(--danger-text)',
  fontSize: '10px',
  background: 'var(--danger-background)',
  border: '1px solid var(--danger-border)',
  borderRadius: '10px',
})

const runtimeStatusEmpty = style({
  minHeight: '280px',
  display: 'grid',
  placeContent: 'center',
  justifyItems: 'center',
  gap: '8px',
  padding: '24px',
  color: 'var(--text-secondary)',
  textAlign: 'center',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const runtimeStatusHero = style([
  {
    position: 'relative',
    minWidth: '0',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: '48px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    background:
      'linear-gradient(115deg, color-mix(in srgb, var(--accent-muted) 58%, var(--surface-elevated)), var(--surface-elevated) 62%)',
    border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border-subtle))',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
    selectors: {
      '&::after': {
        position: 'absolute',
        top: '-80px',
        right: '-50px',
        width: '220px',
        height: '220px',
        content: '""',
        background:
          'radial-gradient(circle, color-mix(in srgb, var(--accent-muted) 48%, transparent), transparent 68%)',
        pointerEvents: 'none',
      },
    },
  },
  {
    '@container': {
      'runtime-status (max-width: 540px)': {
        gridTemplateColumns: '42px minmax(0, 1fr)',
      },
    },
  },
])

const isHealthy = style({})
const isDegraded = style({
  selectors: {
    [`${runtimeStatusHero}&`]: {
      background:
        'linear-gradient(115deg, color-mix(in srgb, var(--warning-background) 72%, var(--surface-elevated)), var(--surface-elevated) 62%)',
      borderColor: 'color-mix(in srgb, var(--warning-text) 22%, var(--border-subtle))',
    },
  },
})

const runtimeStatusHeroIcon = style({
  width: '48px',
  height: '48px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--surface-elevated) 78%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
  borderRadius: '14px',
  selectors: {
    [`${runtimeStatusHero}${isDegraded} &`]: {
      color: 'var(--warning-text)',
      borderColor: 'color-mix(in srgb, var(--warning-text) 24%, transparent)',
    },
  },
})

const runtimeStatusSummary = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  {
    '@container': {
      'runtime-status (max-width: 880px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const runtimeSummaryCard = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '38px minmax(0, 1fr)',
  alignItems: 'start',
  gap: '12px',
  padding: '16px',
  background:
    'linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 97%, var(--accent) 3%), var(--surface-elevated))',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: 'var(--surface-shadow)',
})

const runtimeSummaryIcon = style({
  width: '38px',
  height: '38px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 78%, transparent)',
  borderRadius: '11px',
})

const runtimeServiceSection = style({
  padding: 'clamp(16px, 2vw, 20px)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const runtimeServiceGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '9px',
  },
  {
    '@container': {
      'runtime-status (max-width: 720px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const runtimeServiceCard = style([
  {
    minWidth: '0',
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '11px',
    padding: '12px',
    background: 'color-mix(in srgb, var(--surface-muted) 62%, transparent)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
  },
  {
    '@container': {
      'runtime-status (max-width: 420px)': {
        gridTemplateColumns: '34px minmax(0, 1fr)',
      },
    },
  },
])

const isReady = style({})
const isWarning = style({
  selectors: {
    [`${runtimeServiceCard}&`]: {
      borderColor: 'color-mix(in srgb, var(--warning-text) 18%, var(--border-subtle))',
    },
  },
})
const isUnavailable = style({})
const isError = style({
  selectors: {
    [`${runtimeServiceCard}&`]: {
      borderColor: 'var(--danger-border)',
    },
  },
})

const runtimeServiceIcon = style({
  width: '34px',
  height: '34px',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'color-mix(in srgb, var(--accent-muted) 74%, transparent)',
  borderRadius: '10px',
  selectors: {
    [`${runtimeServiceCard}${isWarning} &`]: {
      color: 'var(--warning-text)',
      background: 'var(--warning-background)',
    },
    [`${runtimeServiceCard}${isUnavailable} &`]: {
      color: 'var(--text-tertiary)',
      background: 'var(--surface-elevated)',
    },
    [`${runtimeServiceCard}${isError} &`]: {
      color: 'var(--danger-text)',
      background: 'var(--danger-background)',
    },
  },
})

export const styles = {
  'runtime-status-panel': runtimeStatusPanel,
  'runtime-status-heading': runtimeStatusHeading,
  'runtime-status-actions': runtimeStatusActions,
  'runtime-status-error': runtimeStatusError,
  'runtime-status-empty': runtimeStatusEmpty,
  'runtime-status-hero': runtimeStatusHero,
  'runtime-status-hero-icon': runtimeStatusHeroIcon,
  'is-healthy': isHealthy,
  'is-degraded': isDegraded,
  'runtime-status-summary': runtimeStatusSummary,
  'runtime-summary-card': runtimeSummaryCard,
  'runtime-summary-icon': runtimeSummaryIcon,
  'runtime-service-section': runtimeServiceSection,
  'runtime-service-grid': runtimeServiceGrid,
  'runtime-service-card': runtimeServiceCard,
  'runtime-service-icon': runtimeServiceIcon,
  'is-ready': isReady,
  'is-warning': isWarning,
  'is-unavailable': isUnavailable,
  'is-error': isError,
} as const

globalStyle(`${runtimeStatusHeading} > div:first-child`, {
  minWidth: '0',
})

globalStyle(`${runtimeStatusHeading} p`, {
  margin: '0 0 6px',
  color: 'var(--accent)',
  fontSize: '9px',
  fontWeight: '800',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
})

globalStyle(`${runtimeStatusHeading} h2`, {
  margin: '0',
  fontSize: '18px',
})

globalStyle(`${runtimeStatusHeading} div > span`, {
  display: 'block',
  marginTop: '5px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
})

globalStyle(`${runtimeStatusActions} button`, {
  '@container': {
    'runtime-status (max-width: 440px)': {
      width: '100%',
    },
  },
})

globalStyle(`${runtimeStatusEmpty} > svg`, {
  width: '36px',
  height: '36px',
  color: 'var(--accent)',
})

globalStyle(`${runtimeStatusEmpty} > span`, {
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

globalStyle(`${runtimeStatusHeroIcon} svg`, {
  width: '22px',
  height: '22px',
})

globalStyle(`${runtimeStatusHero} > div`, {
  minWidth: '0',
})

globalStyle(`${runtimeStatusHero} p`, {
  margin: '0',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${runtimeStatusHero}${isDegraded} p`, {
  color: 'var(--warning-text)',
})

globalStyle(`${runtimeStatusHero} h3`, {
  margin: '4px 0 0',
  fontSize: '16px',
})

globalStyle(`${runtimeStatusHero} div > span`, {
  display: 'block',
  marginTop: '4px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
})

globalStyle(`${runtimeStatusHero} > [data-ui='badge']`, {
  position: 'relative',
  zIndex: '1',
  '@container': {
    'runtime-status (max-width: 540px)': {
      gridColumn: '1 / -1',
      justifySelf: 'start',
    },
  },
})

globalStyle(`${runtimeSummaryIcon} svg`, {
  width: '18px',
  height: '18px',
})

globalStyle(`${runtimeSummaryCard} > div`, {
  minWidth: '0',
})

globalStyle(`${runtimeSummaryCard} div > span`, {
  display: 'block',
  color: 'var(--text-tertiary)',
  fontSize: '8px',
  fontWeight: '700',
  letterSpacing: '0.05em',
})

globalStyle(`${runtimeSummaryCard} strong`, {
  display: 'block',
  overflow: 'hidden',
  marginTop: '6px',
  fontSize: '14px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${runtimeSummaryCard} small`, {
  display: 'block',
  overflow: 'hidden',
  marginTop: '4px',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${runtimeSummaryCard} > button`, {
  gridColumn: '2',
  justifySelf: 'start',
  marginTop: '6px',
})

globalStyle(`${runtimeServiceSection} > header`, {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '14px',
})

globalStyle(`${runtimeServiceSection} > header p`, {
  margin: '0',
  color: 'var(--accent)',
  fontSize: '8px',
  fontWeight: '800',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
})

globalStyle(`${runtimeServiceSection} > header h3`, {
  margin: '4px 0 0',
  fontSize: '15px',
})

globalStyle(`${runtimeServiceSection} > header > span`, {
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

globalStyle(`${runtimeServiceIcon} svg`, {
  width: '16px',
  height: '16px',
})

globalStyle(`${runtimeServiceCard} > div`, {
  minWidth: '0',
})

globalStyle(`${runtimeServiceCard} strong`, {
  display: 'block',
  fontSize: '11px',
})

globalStyle(`${runtimeServiceCard} p`, {
  overflow: 'hidden',
  margin: '3px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '9px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

globalStyle(`${runtimeServiceCard} > [data-ui='badge']`, {
  '@container': {
    'runtime-status (max-width: 420px)': {
      gridColumn: '1 / -1',
      justifySelf: 'start',
    },
  },
})
