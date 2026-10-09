import { style } from '@vanilla-extract/css'

const isOutside = style({})
const isToday = style({})
const isWeekend = style({})
const isHoliday = style({})
const isWorkday = style({})
const isHighlighted = style({})
const isSelected = style({})

const calendarPage = style([
  {
    width: '100%',
    minWidth: '0',
    height: '100%',
    minHeight: '0',
    display: 'grid',
    gridTemplateRows: 'minmax(min-content, 1fr) minmax(0, max-content)',
    gap: '16px',
    margin: '0 auto',
    padding: 'clamp(18px, 2.4cqw, 24px) clamp(28px, 4.5cqw, 52px) clamp(22px, 2.8cqw, 30px)',
    containerName: 'calendar-page',
    containerType: 'inline-size',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  },
  {
    '@container': {
      'app-content (max-width: 620px)': {
        gap: '12px',
        padding: '14px 16px 20px',
      },
      'app-content (max-width: 390px)': {
        paddingRight: '12px',
        paddingLeft: '12px',
      },
    },
  },
])

const calendarPanel = style([
  {
    minWidth: '0',
    minHeight: '0',
    display: 'grid',
    gridTemplateRows: 'max-content max-content minmax(0, 1fr) max-content',
    padding: '10px',
    overflow: 'hidden',
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated) 94%, var(--accent) 6%), color-mix(in srgb, var(--surface-elevated) 96%, var(--surface-muted) 4%))',
    border: '1px solid color-mix(in srgb, var(--border-strong) 72%, transparent)',
    borderRadius: '22px',
    boxShadow: '0 24px 64px rgba(6, 12, 21, 0.14)',
  },
  {
    '@container': {
      'calendar-page (max-width: 620px)': {
        padding: '8px',
        borderRadius: '18px',
      },
      'calendar-page (max-width: 390px)': {
        padding: '7px',
        borderRadius: '15px',
      },
    },
  },
])

const calendarToolbar = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px',
    marginBottom: '8px',
    padding: '11px 14px',
    background:
      'radial-gradient(circle at 0% 0%, var(--accent-muted), transparent 36%), color-mix(in srgb, var(--surface-elevated) 96%, var(--accent) 4%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(6, 12, 21, 0.07)',
  },
  {
    '@container': {
      'calendar-page (max-width: 620px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
        gap: '14px',
        marginBottom: '8px',
        padding: '11px 12px',
      },
      'calendar-page (max-width: 390px)': {
        gap: '8px',
        padding: '8px',
      },
    },
  },
])

const calendarHeading = style({
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
})

const calendarHeadingIcon = style({
  width: '36px',
  height: '36px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--accent)',
  background: 'var(--accent-muted)',
  border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
  borderRadius: '13px',
})

const calendarHeadingIconSvg = style({
  width: '18px',
  height: '18px',
})

const calendarHeadingTitle = style({
  margin: '0',
  fontSize: '18px',
  letterSpacing: '-0.02em',
  '@container': {
    'calendar-page (max-width: 390px)': {
      fontSize: '16px',
    },
  },
})

const calendarHeadingText = style({
  margin: '4px 0 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  lineHeight: '1.4',
  '@container': {
    'calendar-page (max-width: 390px)': {
      marginTop: '2px',
      fontSize: '9px',
      lineHeight: '1.2',
    },
  },
})

const calendarControls = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  {
    '@container': {
      'calendar-page (max-width: 620px)': {
        justifyContent: 'flex-start',
      },
      'calendar-page (max-width: 390px)': {
        display: 'grid',
        gridTemplateColumns: '32px minmax(0, 1fr) minmax(0, 1fr) 28px 32px',
      },
      'calendar-page (max-width: 320px)': {
        gridTemplateColumns: '32px minmax(0, 1fr) 32px',
      },
    },
  },
])

const calendarArrowButton = style({
  width: '32px',
  padding: '0',
  borderRadius: '10px',
  '@container': {
    'calendar-page (max-width: 320px)': {
      selectors: {
        '&:last-child': {
          gridColumn: '3',
          gridRow: '1',
        },
      },
    },
  },
})

const calendarYearSelect = style({
  width: '136px',
  minWidth: '136px',
  '@container': {
    'calendar-page (max-width: 390px)': {
      width: '100%',
      minWidth: '0',
    },
    'calendar-page (max-width: 320px)': {
      gridColumn: '2',
      gridRow: '1',
    },
  },
})

const calendarMonthSelect = style({
  width: '96px',
  minWidth: '96px',
  '@container': {
    'calendar-page (max-width: 390px)': {
      width: '100%',
      minWidth: '0',
    },
    'calendar-page (max-width: 320px)': {
      gridColumn: '2',
      gridRow: '2',
    },
  },
})

const calendarTodayButton = style({
  width: '28px',
  minWidth: '28px',
  padding: '0',
  borderRadius: '50%',
  '@container': {
    'calendar-page (max-width: 320px)': {
      gridColumn: '1',
      gridRow: '2',
      justifySelf: 'center',
    },
  },
  selectors: {
    "&[data-button-variant='ghost']": {
      background: 'transparent',
    },
    "&[data-button-variant='ghost']:hover": {
      background: 'var(--accent-muted)',
    },
    "&[data-button-variant='ghost']:focus-visible": {
      boxShadow: '0 0 0 3px var(--accent-muted)',
    },
  },
})

const calendarTodayDot = style({
  width: '14px',
  height: '14px',
  background: 'var(--accent)',
  borderRadius: '50%',
  boxShadow: '0 3px 8px color-mix(in srgb, var(--accent) 24%, transparent)',
})

const calendarWeekdays = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  marginBottom: '5px',
  padding: '0 2px',
})

const calendarWeekday = style({
  minWidth: '0',
  padding: '5px 4px',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  fontWeight: '800',
  textAlign: 'center',
  selectors: {
    [`&${isWeekend}`]: {
      color: 'var(--danger-text)',
    },
  },
})

const calendarGrid = style({
  minHeight: '0',
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gridAutoRows: 'minmax(0, 1fr)',
  gap: '6px',
  '@container': {
    'calendar-page (max-width: 620px)': {
      gap: '4px',
    },
    'calendar-page (max-width: 390px)': {
      gap: '3px',
    },
  },
})

const calendarDay = style([
  {
    minWidth: '0',
    height: 'clamp(54px, 8vh, 72px)',
    minHeight: '0',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '5px 8px',
    color: 'var(--text-primary)',
    background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--surface-muted) 4%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    boxShadow: '0 5px 16px rgba(6, 12, 21, 0.035)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
    selectors: {
      '&:hover': {
        zIndex: '2',
        borderColor: 'color-mix(in srgb, var(--accent) 32%, var(--border-subtle))',
        boxShadow: '0 10px 24px rgba(6, 12, 21, 0.09)',
        transform: 'translateY(-2px)',
      },
      '&:focus-visible': {
        zIndex: '3',
        borderColor: 'var(--accent)',
        boxShadow: '0 0 0 3px var(--accent-muted)',
      },
      [`&${isOutside}`]: {
        color: 'var(--text-tertiary)',
        background: 'color-mix(in srgb, var(--surface-elevated) 86%, var(--surface-muted) 14%)',
        boxShadow: 'none',
      },
      [`&${isWeekend}:not(${isWorkday})`]: {
        color: 'var(--danger-text)',
      },
      [`&${isHoliday}`]: {
        background: 'color-mix(in srgb, var(--surface-elevated) 84%, var(--danger-background) 16%)',
        borderColor: 'color-mix(in srgb, var(--danger-border) 72%, var(--border-subtle))',
      },
      [`&${isWorkday}`]: {
        background: 'color-mix(in srgb, var(--surface-elevated) 88%, #f2a53b 12%)',
        borderColor: 'color-mix(in srgb, #d58a25 25%, var(--border-subtle))',
      },
      [`&${isToday}`]: {
        position: 'relative',
        zIndex: '1',
        background: 'color-mix(in srgb, var(--surface-elevated) 84%, var(--accent-muted) 16%)',
        borderColor: 'color-mix(in srgb, var(--accent) 58%, var(--border-subtle))',
        boxShadow: '0 8px 22px color-mix(in srgb, var(--accent) 12%, transparent)',
      },
      [`&${isSelected}`]: {
        zIndex: '2',
        borderColor: 'var(--accent)',
        boxShadow: '0 0 0 2px var(--accent-muted), 0 9px 22px rgba(6, 12, 21, 0.08)',
      },
    },
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  {
    '@container': {
      'calendar-page (max-width: 520px)': {
        height: '54px',
        padding: '4px 5px',
        borderRadius: '9px',
        boxShadow: 'none',
      },
      'calendar-page (max-width: 390px)': {
        height: '50px',
        padding: '4px',
        borderRadius: '7px',
      },
      'calendar-page (max-width: 320px)': {
        height: '48px',
        gap: '1px',
        padding: '3px 2px',
      },
    },
  },
])

const calendarDayTopline = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4px',
  '@container': {
    'calendar-page (max-width: 390px)': {
      gap: '2px',
    },
    'calendar-page (max-width: 320px)': {
      alignItems: 'flex-start',
      flexDirection: 'column',
      gap: '1px',
    },
  },
})

const calendarDayNumber = style({
  width: '23px',
  height: '23px',
  display: 'grid',
  placeItems: 'center',
  fontSize: '14px',
  fontWeight: '800',
  lineHeight: '1',
  borderRadius: '8px',
  '@container': {
    'calendar-page (max-width: 390px)': {
      width: '18px',
      height: '18px',
      fontSize: '12px',
      borderRadius: '6px',
    },
    'calendar-page (max-width: 320px)': {
      width: '16px',
      height: '16px',
      fontSize: '11px',
    },
  },
  selectors: {
    [`${calendarDay}${isToday} &`]: {
      color: 'var(--button-primary-text)',
      background: 'var(--accent)',
      boxShadow: '0 5px 12px color-mix(in srgb, var(--accent) 24%, transparent)',
    },
  },
})

const calendarStatus = style({
  width: '18px',
  height: '18px',
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  fontSize: '10px',
  fontStyle: 'normal',
  fontWeight: '900',
  borderRadius: '7px',
  boxShadow: '0 4px 10px rgba(6, 12, 21, 0.12)',
  '@container': {
    'calendar-page (max-width: 390px)': {
      width: '14px',
      height: '14px',
      fontSize: '9px',
      borderRadius: '5px',
    },
    'calendar-page (max-width: 320px)': {
      width: '10px',
      height: '10px',
      fontSize: '8px',
      borderRadius: '3px',
    },
  },
})

const calendarStatusHoliday = style({
  background: '#e15850',
})

const calendarStatusWorkday = style({
  background: '#d58a25',
})

const calendarLunar = style({
  minWidth: '0',
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  fontWeight: '650',
  lineHeight: '1.3',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '@container': {
    'calendar-page (max-width: 320px)': {
      fontSize: '8px',
      lineHeight: '1.2',
    },
  },
  selectors: {
    [`&${isHighlighted}`]: {
      color: 'var(--text-secondary)',
      fontWeight: '800',
    },
    [`${calendarDay}${isOutside} &`]: {
      opacity: '0.7',
    },
  },
})

const calendarFooter = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    marginTop: '8px',
    padding: '7px 4px 1px',
    color: 'var(--text-tertiary)',
    fontSize: '10px',
  },
  {
    '@container': {
      'calendar-page (max-width: 560px)': {
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: '6px',
        marginTop: '4px',
        paddingTop: '4px',
      },
    },
  },
])

const calendarLegend = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
})

const calendarLegendItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
})

const calendarLegendHoliday = style([calendarStatus, calendarStatusHoliday, { width: '18px', height: '18px' }])
const calendarLegendWorkday = style([calendarStatus, calendarStatusWorkday, { width: '18px', height: '18px' }])

const calendarLegendToday = style({
  width: '14px',
  height: '14px',
  border: '2px solid var(--accent)',
  borderRadius: '4px',
})

const calendarFooterLink = style({
  minWidth: '0',
  overflowWrap: 'anywhere',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  selectors: {
    '&:hover': { color: 'var(--accent)' },
    '&:focus-visible': { color: 'var(--accent)', outline: '2px solid var(--focus-ring)', outlineOffset: '3px' },
  },
})

export const styles = {
  'calendar-page': calendarPage,
  'calendar-panel': calendarPanel,
  'calendar-toolbar': calendarToolbar,
  'calendar-heading': calendarHeading,
  'calendar-heading-icon': calendarHeadingIcon,
  'calendar-heading-icon-svg': calendarHeadingIconSvg,
  'calendar-heading-title': calendarHeadingTitle,
  'calendar-heading-text': calendarHeadingText,
  'calendar-controls': calendarControls,
  'calendar-arrow-button': calendarArrowButton,
  'calendar-year-select': calendarYearSelect,
  'calendar-month-select': calendarMonthSelect,
  'calendar-today-button': calendarTodayButton,
  'calendar-today-dot': calendarTodayDot,
  'calendar-weekdays': calendarWeekdays,
  'calendar-weekday': calendarWeekday,
  'calendar-grid': calendarGrid,
  'calendar-day': calendarDay,
  'calendar-day-topline': calendarDayTopline,
  'calendar-day-number': calendarDayNumber,
  'calendar-status': calendarStatus,
  'calendar-status-holiday': calendarStatusHoliday,
  'calendar-status-workday': calendarStatusWorkday,
  'calendar-lunar': calendarLunar,
  'calendar-footer': calendarFooter,
  'calendar-legend': calendarLegend,
  'calendar-legend-item': calendarLegendItem,
  'calendar-legend-holiday': calendarLegendHoliday,
  'calendar-legend-workday': calendarLegendWorkday,
  'calendar-legend-today': calendarLegendToday,
  'calendar-footer-link': calendarFooterLink,
  'is-outside': isOutside,
  'is-today': isToday,
  'is-weekend': isWeekend,
  'is-holiday': isHoliday,
  'is-workday': isWorkday,
  'is-highlighted': isHighlighted,
  'is-selected': isSelected,
} as const
