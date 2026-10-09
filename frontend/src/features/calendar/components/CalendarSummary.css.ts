import { style } from '@vanilla-extract/css'

const summary = style({
  position: 'relative',
  minWidth: '0',
  minHeight: '0',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.35fr)',
  alignItems: 'center',
  gap: 'clamp(20px, 3cqw, 40px)',
  padding: 'clamp(16px, 2cqw, 24px) clamp(20px, 3cqw, 36px)',
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
      gap: '10px',
      padding: '12px 16px',
      borderRadius: '18px',
    },
    'calendar-page (max-width: 390px)': {
      padding: '10px 12px',
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
  fontSize: 'clamp(48px, 7cqw, 76px)',
  fontWeight: '800',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: '1',
  letterSpacing: '-0.06em',
  '@container': {
    'calendar-page (max-width: 620px)': {
      fontSize: '40px',
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
  fontSize: '10px',
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
  fontSize: '12px',
  fontWeight: '750',
  lineHeight: '1.5',
})

const dateMeta = style({
  color: 'var(--text-secondary)',
  fontSize: '11px',
})

const dateStatus = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--accent)',
  fontSize: '11px',
  fontWeight: '700',
  lineHeight: '1.5',
})

const hint = style({
  margin: '12px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
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
  paddingLeft: 'clamp(20px, 3cqw, 40px)',
  borderLeft: '1px solid var(--border-subtle)',
  '@container': {
    'calendar-page (max-width: 620px)': {
      paddingTop: '10px',
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
  fontSize: '12px',
  fontWeight: '750',
})

const monthMeta = style({
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const festivals = style({
  minWidth: '0',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
  '@container': {
    'calendar-page (max-width: 620px)': {
      gap: '6px',
      marginTop: '8px',
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
  fontSize: '10px',
  fontVariantNumeric: 'tabular-nums',
})

const empty = style({
  margin: '12px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.6',
})

const zodiacOverview = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px 12px',
  marginTop: '12px',
  '@container': {
    'calendar-page (max-width: 620px)': {
      marginTop: '8px',
      gap: '6px 10px',
    },
  },
})

const zodiacRanges = style({
  minWidth: '0',
  flex: '1 1 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '6px',
})

const zodiacRange = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '3px 5px',
  padding: '5px 7px',
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
  fontSize: '14px',
  lineHeight: '1',
})

const zodiacName = style({
  fontSize: '11px',
  fontWeight: '700',
  whiteSpace: 'nowrap',
})

const zodiacDates = style({
  color: 'var(--text-tertiary)',
  fontSize: '10px',
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
  zodiacRanges,
  zodiacRange,
  zodiacSymbol,
  zodiacName,
  zodiacDates,
} as const
