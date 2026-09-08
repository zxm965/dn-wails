import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'

import { Button, PageHeader, Select } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { openExternalURL } from '@/shared/native-kit'

import { getHolidayScheduleInfo, OFFICIAL_HOLIDAY_YEARS } from '../data/chinaHolidays'
import {
  buildCalendarMonth,
  CALENDAR_MAX_YEAR,
  CALENDAR_MIN_YEAR,
  shiftMonth,
  toDateKey,
  type CalendarDay,
} from '../model/calendar'

import { styles } from './CalendarPanel.css'

const cx = createScopedClassNames(styles)
const weekDays = ['日', '一', '二', '三', '四', '五', '六'] as const
const yearOptions = Array.from({ length: CALENDAR_MAX_YEAR - CALENDAR_MIN_YEAR + 1 }, (_, index) => {
  const year = CALENDAR_MIN_YEAR + index
  return { value: year, label: `${year} 年` }
})
const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `${index + 1} 月` }))

function dayDescription(day: CalendarDay): string {
  const parts = [`${day.date.getFullYear()}年${day.date.getMonth() + 1}月${day.day}日`, `农历${day.lunarLabel}`]
  if (day.traditionalFestival) parts.push(day.traditionalFestival)
  if (day.holiday)
    parts.push(day.holiday.status === 'holiday' ? `${day.holiday.name}，休息` : `${day.holiday.name}，上班`)
  return parts.join('，')
}

function CalendarDayCell({
  day,
  selected,
  onSelect,
}: {
  day: CalendarDay
  selected: boolean
  onSelect: (dateKey: string) => void
}) {
  const status = day.holiday?.status
  const secondaryLabel = day.holiday?.name ?? day.traditionalFestival ?? day.lunarLabel

  function selectDay() {
    onSelect(day.dateKey)
  }

  return (
    <div
      className={cx(
        `calendar-day${day.isCurrentMonth ? '' : ' is-outside'}${day.isToday ? ' is-today' : ''}${day.isWeekend ? ' is-weekend' : ''}${status === 'holiday' ? ' is-holiday' : ''}${status === 'workday' ? ' is-workday' : ''}${selected ? ' is-selected' : ''}`,
      )}
      role='gridcell'
      aria-label={dayDescription(day)}
      aria-current={day.isToday ? 'date' : undefined}
      aria-selected={selected}
      tabIndex={0}
      onClick={selectDay}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        selectDay()
      }}
    >
      <div className={cx('calendar-day-topline')}>
        <time dateTime={day.dateKey} className={cx('calendar-day-number')}>
          {day.day}
        </time>
        {status && (
          <span className={cx(`calendar-status calendar-status-${status}`)} aria-hidden='true'>
            {status === 'holiday' ? '休' : '班'}
          </span>
        )}
      </div>
      <span className={cx(`calendar-lunar${day.holiday || day.traditionalFestival ? ' is-highlighted' : ''}`)}>
        {secondaryLabel}
      </span>
    </div>
  )
}

export function CalendarPanel() {
  const { notify } = useFeedback()
  const today = useMemo(() => new Date(), [])
  const [displayed, setDisplayed] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }))
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today))
  const days = useMemo(() => buildCalendarMonth(displayed.year, displayed.month, today), [displayed, today])
  const scheduleInfo = getHolidayScheduleInfo(displayed.year)
  const availableYears = `${OFFICIAL_HOLIDAY_YEARS[0]}–${OFFICIAL_HOLIDAY_YEARS.at(-1)}`
  const previous = shiftMonth(displayed.year, displayed.month, -1)
  const next = shiftMonth(displayed.year, displayed.month, 1)
  const canGoPrevious = previous.year >= CALENDAR_MIN_YEAR
  const canGoNext = next.year <= CALENDAR_MAX_YEAR

  function goToToday() {
    setDisplayed({ year: today.getFullYear(), month: today.getMonth() + 1 })
  }

  async function openSource(event: MouseEvent<HTMLAnchorElement>, url: string) {
    event.preventDefault()
    try {
      await openExternalURL(url)
    } catch (error) {
      notify({
        title: '来源链接打开失败',
        message: error instanceof Error && error.message ? error.message : '请稍后重试。',
        tone: 'error',
      })
    }
  }

  return (
    <div className={cx('calendar-page')}>
      <PageHeader
        eyebrow='Calendar'
        title='日历'
        subtitle='查看公历、农历，以及国务院公布的法定节假日和调休补班安排。'
      />

      <section className={cx('calendar-panel')} aria-labelledby='calendar-heading'>
        <header className={cx('calendar-toolbar')}>
          <div className={cx('calendar-heading')}>
            <span className={cx('calendar-heading-icon')} aria-hidden='true'>
              <CalendarDays className={cx('calendar-heading-icon-svg')} />
            </span>
            <div>
              <h2 id='calendar-heading' className={cx('calendar-heading-title')}>
                {displayed.year} 年 {displayed.month} 月
              </h2>
              <p className={cx('calendar-heading-text')}>
                {scheduleInfo.available
                  ? '已载入国务院节假日安排'
                  : `暂无该年度官方调休数据（已收录 ${availableYears}）`}
              </p>
            </div>
          </div>

          <div className={cx('calendar-controls')}>
            <Button
              className={cx('calendar-arrow-button')}
              size='md'
              variant='ghost'
              type='button'
              aria-label='上个月'
              disabled={!canGoPrevious}
              onClick={() => canGoPrevious && setDisplayed(previous)}
            >
              <ChevronLeft aria-hidden='true' />
            </Button>
            <Select
              className={cx('calendar-year-select')}
              size='md'
              aria-label='选择年份'
              value={displayed.year}
              options={yearOptions}
              onValueChange={(year) => setDisplayed((current) => ({ ...current, year }))}
            />
            <Select
              className={cx('calendar-month-select')}
              size='md'
              aria-label='选择月份'
              value={displayed.month}
              options={monthOptions}
              onValueChange={(month) => setDisplayed((current) => ({ ...current, month }))}
            />
            <Button
              className={cx('calendar-today-button')}
              size='sm'
              variant='ghost'
              type='button'
              title='回到今天'
              aria-label='回到今天'
              onClick={goToToday}
            >
              <span className={cx('calendar-today-dot')} aria-hidden='true' />
            </Button>
            <Button
              className={cx('calendar-arrow-button')}
              size='md'
              variant='ghost'
              type='button'
              aria-label='下个月'
              disabled={!canGoNext}
              onClick={() => canGoNext && setDisplayed(next)}
            >
              <ChevronRight aria-hidden='true' />
            </Button>
          </div>
        </header>

        <div className={cx('calendar-weekdays')} role='row'>
          {weekDays.map((day, index) => (
            <span
              key={day}
              className={cx(`calendar-weekday${index === 0 || index === 6 ? ' is-weekend' : ''}`)}
              role='columnheader'
            >
              周{day}
            </span>
          ))}
        </div>
        <div className={cx('calendar-grid')} role='grid' aria-label={`${displayed.year}年${displayed.month}月日历`}>
          {days.map((day) => (
            <CalendarDayCell
              key={day.dateKey}
              day={day}
              selected={day.dateKey === selectedDateKey}
              onSelect={setSelectedDateKey}
            />
          ))}
        </div>

        <footer className={cx('calendar-footer')}>
          <div className={cx('calendar-legend')} aria-label='状态图例'>
            <span className={cx('calendar-legend-item')}>
              <i className={cx('calendar-legend-holiday')}>休</i> 放假
            </span>
            <span className={cx('calendar-legend-item')}>
              <i className={cx('calendar-legend-workday')}>班</i> 调休补班
            </span>
            <span className={cx('calendar-legend-item')}>
              <i className={cx('calendar-legend-today')} /> 今天
            </span>
          </div>
          {scheduleInfo.available && scheduleInfo.sourceUrl && (
            <a
              className={cx('calendar-footer-link')}
              href={scheduleInfo.sourceUrl}
              target='_blank'
              rel='noreferrer'
              title={scheduleInfo.sourceTitle}
              onClick={(event) => void openSource(event, scheduleInfo.sourceUrl)}
            >
              数据来源：中国政府网
            </a>
          )}
        </footer>
      </section>
    </div>
  )
}
