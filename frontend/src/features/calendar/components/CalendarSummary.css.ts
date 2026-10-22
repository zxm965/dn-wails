import { style } from '@vanilla-extract/css'

const summary = style({
  position: 'relative',
  minWidth: '0',
  minHeight: '0',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.35fr)',
  alignItems: 'center',
  gap: 'calc(clamp(20px, 3cqw, 40px) * var(--layout-spacing))',
  padding:
    'calc(clamp(16px, 2cqw, 24px) * var(--layout-spacing)) calc(clamp(20px, 3cqw, 36px) * var(--layout-spacing))',
  overflow: 'hidden',
  background:
    'radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--accent-muted) 65%, transparent), transparent 60%), color-mix(in srgb, var(--surface-elevated) 65%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '22px',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      right: '-72px',
      bottom: '-130px',
      width: '260px',
      height: '260px',
      border: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)',
      borderRadius: '50%',
      boxShadow: '0 0 0 28px color-mix(in srgb, var(--accent) 3%, transparent)',
      pointerEvents: 'none',
    },
  },
  '@container': {
    'calendar-page (max-width: 620px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: 'calc(10px * var(--layout-spacing))',
      padding: 'calc(12px * var(--layout-spacing)) calc(16px * var(--layout-spacing))',
      borderRadius: '18px',
    },
    'calendar-page (max-width: 390px)': {
      padding: 'calc(10px * var(--layout-spacing)) calc(12px * var(--layout-spacing))',
      borderRadius: '15px',
    },
  },
})

const selectedDate = style({
  position: 'relative',
  zIndex: '1',
  minWidth: '0',
})

const dateRow = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '18px',
  '@container': {
    'calendar-page (max-width: 390px)': {
      gap: '12px',
    },
  },
})

const dateNumber = style({
  flex: '0 0 auto',
  color: 'var(--accent)',
  fontSize:
    'clamp(calc(48px + var(--font-size-heading-offset)), calc(7cqw + var(--font-size-heading-offset)), calc(76px + var(--font-size-heading-offset)))',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: '1',
  letterSpacing: '-0.06em',
  '@container': {
    'calendar-page (max-width: 620px)': {
      fontSize: 'calc(40px + var(--font-size-heading-offset))',
    },
  },
})

const dateDetails = style({
  minWidth: '0',
  display: 'grid',
  gap: '5px',
  '@container': {
    'calendar-page (max-width: 620px)': {
      gap: '3px',
    },
  },
  overflowWrap: 'anywhere',
})

const caption = style({
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  fontWeight: '700',
  letterSpacing: '0.08em',
  '@container': {
    'calendar-page (max-width: 390px)': {
      display: 'none',
    },
  },
})

const dateTitle = style({
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-secondary)',
  fontWeight: '750',
  lineHeight: '1.5',
})

const dateMeta = style({
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
})

const dateStatus = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--accent)',
  fontSize: 'var(--font-size-secondary)',
  fontWeight: '700',
  lineHeight: '1.5',
})

const hint = style({
  margin: '12px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  lineHeight: '1.6',
  overflowWrap: 'anywhere',
  '@container': {
    'calendar-page (max-width: 620px)': {
      display: 'none',
    },
  },
})

const monthOverview = style({
  position: 'relative',
  zIndex: '1',
  minWidth: '0',
  paddingLeft: 'calc(clamp(20px, 3cqw, 40px) * var(--layout-spacing))',
  borderLeft: '1px solid var(--border-subtle)',
  '@container': {
    'calendar-page (max-width: 620px)': {
      paddingTop: 'calc(10px * var(--layout-spacing))',
      paddingLeft: '0',
      borderTop: '1px solid var(--border-subtle)',
      borderLeft: '0',
    },
  },
})

const overviewHeading = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: '8px 12px',
})

const overviewTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
})

const overviewIcon = style({
  width: '15px',
  height: '15px',
  color: 'var(--accent)',
})

const heading = style({
  margin: '0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  fontWeight: '750',
})

const monthMeta = style({
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
})

const festivals = style({
  minWidth: '0',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(8px * var(--layout-spacing))',
  marginTop: 'calc(12px * var(--layout-spacing))',
  '@container': {
    'calendar-page (max-width: 620px)': {
      gap: 'calc(6px * var(--layout-spacing))',
      marginTop: 'calc(8px * var(--layout-spacing))',
    },
  },
})

const festivalButton = style({
  maxWidth: '100%',
  minWidth: '0',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
  selectors: {
    '&[aria-pressed="true"]': {
      color: 'var(--accent)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border-subtle))',
    },
  },
})

const festivalDate = style({
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  fontVariantNumeric: 'tabular-nums',
})

const empty = style({
  margin: '12px 0 0',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: '1.6',
})

const zodiacOverview = style({
  minWidth: 0,
  marginTop: 'calc(12px * var(--layout-spacing))',
})

const zodiacToggle = style({
  width: '100%',
  justifyContent: 'flex-start',
  padding: '0 2px',
  gap: '8px',
  fontSize: 'var(--font-size-secondary)',
  fontWeight: 600,
  borderRadius: '6px',
  selectors: {
    '&[data-button-variant="ghost"]': { background: 'transparent' },
    '&[data-button-variant="ghost"]:hover:not(:disabled)': { color: 'var(--accent)', background: 'transparent' },
    '&[aria-expanded="true"]': { color: 'var(--text-primary)' },
  },
})
const zodiacToggleIcon = style({ width: '14px', height: '14px', color: 'var(--accent)', flexShrink: 0 })
const zodiacRule = style({
  flex: 1,
  minWidth: '12px',
  height: '1px',
  background: 'var(--border-subtle)',
  margin: '0 4px',
})
const zodiacChevron = style({
  display: 'grid',
  placeItems: 'center',
  width: '22px',
  height: '22px',
  flexShrink: 0,
  borderRadius: '50%',
  color: 'var(--text-tertiary)',
  transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 160ms ease, color 160ms ease',
  selectors: {
    [`${zodiacToggle}[aria-expanded="true"] &`]: { transform: 'rotate(180deg)', color: 'var(--accent)' },
    [`${zodiacToggle}:hover &`]: { background: 'var(--accent-muted)', color: 'var(--accent)' },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
})
const zodiacPanel = style({
  display: 'grid',
  // Preserve the content's natural height in both states so the calendar never shifts.
  gridTemplateRows: '1fr',
  minWidth: 0,
  opacity: 0,
  visibility: 'hidden',
  transition: 'opacity 180ms ease, visibility 0s linear 260ms',
  selectors: {
    '&[data-expanded="true"]': { opacity: 1, visibility: 'visible', transitionDelay: '0s' },
  },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none' } },
})
const zodiacClip = style({ minHeight: 0, overflow: 'hidden' })
const zodiacRanges = style({
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
  paddingTop: 'calc(10px * var(--layout-spacing))',
  transform: 'translateY(-6px)',
  transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
  selectors: { [`${zodiacPanel}[data-expanded="true"] &`]: { transform: 'translateY(0)' } },
  '@container': { 'calendar-page (max-width: 390px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
  '@media': { '(prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } },
})

const zodiacRange = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '3px 5px',
  padding: 'calc(9px * var(--layout-spacing)) 10px',
  color: 'var(--text-secondary)',
  background: 'color-mix(in srgb, var(--surface-muted) 70%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  selectors: {
    '&[data-selected="true"]': {
      color: 'var(--accent)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 25%, var(--border-subtle))',
    },
  },
})

const zodiacSymbol = style({
  fontSize: 'var(--font-size-body)',
  lineHeight: '1',
})

const zodiacName = style({
  fontSize: 'var(--font-size-secondary)',
  fontWeight: '700',
  whiteSpace: 'nowrap',
})

const zodiacDates = style({
  color: 'var(--text-tertiary)',
  fontSize: 'var(--font-size-caption)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
})

export const styles = {
  summary,
  selectedDate,
  dateRow,
  dateNumber,
  dateDetails,
  caption,
  dateTitle,
  dateMeta,
  dateStatus,
  hint,
  monthOverview,
  overviewHeading,
  overviewTitle,
  overviewIcon,
  heading,
  monthMeta,
  festivals,
  festivalButton,
  festivalDate,
  empty,
  zodiacOverview,
  zodiacToggle,
  zodiacToggleIcon,
  zodiacRule,
  zodiacChevron,
  zodiacPanel,
  zodiacClip,
  zodiacRanges,
  zodiacRange,
  zodiacSymbol,
  zodiacName,
  zodiacDates,
} as const
