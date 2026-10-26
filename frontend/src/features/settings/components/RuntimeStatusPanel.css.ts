import { globalStyle, style } from '@vanilla-extract/css'

const runtimeStatusPanel = style({
  width: '100%',
  display: 'grid',
  gap: 'calc(14px * var(--layout-spacing))',
  containerName: 'runtime-status',
  containerType: 'inline-size',
})

const runtimeServiceSection = style({
  padding: 'calc(16px * var(--layout-spacing))',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--panel-radius)',
  boxShadow: 'var(--surface-shadow)',
})

const runtimeServiceGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'calc(8px * var(--layout-spacing))',
  },
  {
    '@container': {
      'runtime-status (max-width: 560px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
])

const runtimeStatusLink = style({
  justifySelf: 'end',
  maxWidth: '100%',
  padding: '0',
  background: 'transparent',
  border: '0',
  borderRadius: '999px',
  selectors: {
    '&[data-button-variant="ghost"]:hover': { background: 'transparent' },
  },
  '@container': {
    'runtime-status (max-width: 420px)': {
      gridColumn: '1 / -1',
      justifySelf: 'start',
    },
  },
})

const runtimeServiceCard = style([
  {
    minWidth: '0',
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 'calc(8px * var(--layout-spacing))',
    padding: 'calc(8px * var(--layout-spacing))',
    background: 'color-mix(in srgb, var(--surface-muted) 62%, transparent)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
  },
  {
    '@container': {
      'runtime-status (max-width: 420px)': {
        gridTemplateColumns: '28px minmax(0, 1fr)',
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
  width: '28px',
  height: '28px',
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

const pendingDescription = style({ margin: '3px 0 0', fontSize: 'var(--font-size-caption)' })
const descriptionSkeleton = style({
  width: 'min(100%, 18ch)',
  display: 'inline-block',
  verticalAlign: 'middle',
  selectors: { '&[aria-hidden="true"]': { minHeight: 0, height: '0.85em', borderRadius: 4 } },
})

export const styles = {
  pendingDescription,
  descriptionSkeleton,
  'runtime-status-panel': runtimeStatusPanel,
  'runtime-service-section': runtimeServiceSection,
  'runtime-service-grid': runtimeServiceGrid,
  'runtime-status-link': runtimeStatusLink,
  'runtime-service-card': runtimeServiceCard,
  'runtime-service-icon': runtimeServiceIcon,
  'is-ready': isReady,
  'is-warning': isWarning,
  'is-unavailable': isUnavailable,
  'is-error': isError,
} as const

globalStyle(`${runtimeServiceSection} > header`, {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '14px',
})

globalStyle(`${runtimeServiceSection} > header h3`, {
  margin: '0',
  fontSize: 'var(--font-size-subtitle)',
})

globalStyle(`${runtimeServiceSection} > header > span`, {
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
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
  fontSize: 'var(--font-size-secondary)',
})

globalStyle(`${runtimeServiceCard} p`, {
  overflow: 'hidden',
  margin: '3px 0 0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-caption)',
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
