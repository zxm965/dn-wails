import { Flower2, Sparkles } from 'lucide-react'

import { Button } from '@/shared/components/ui'

import type { CalendarDay } from '../model/calendar'
import { getMonthZodiacRanges } from '../model/zodiac'

import { styles } from './CalendarSummary.css'

interface CalendarSummaryProps {
  day: CalendarDay
  monthDays: readonly CalendarDay[]
  onSelect: (dateKey: string) => void
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' })

export function CalendarSummary({ day, monthDays, onSelect }: CalendarSummaryProps) {
  const festivals = monthDays.filter((monthDay) => monthDay.traditionalFestival)
  const weekendCount = monthDays.filter((monthDay) => monthDay.isWeekend).length
  const zodiacRanges = monthDays[0] ? getMonthZodiacRanges(monthDays[0].date) : []
  const dayStatus = day.holiday
    ? `${day.holiday.name} · ${day.holiday.status === 'holiday' ? '放假' : '调休补班'}`
    : day.traditionalFestival

  return (
    <section className={styles.summary} aria-label='日期与本月概览'>
      <div className={styles.selectedDate}>
        <div className={styles.dateRow}>
          <time className={styles.dateNumber} dateTime={day.dateKey}>
            {String(day.day).padStart(2, '0')}
          </time>
          <div className={styles.dateDetails}>
            <span className={styles.caption}>{day.isToday ? '今天' : '所选日期'}</span>
            <span className={styles.dateTitle}>
              {day.date.getFullYear()} 年 {day.date.getMonth() + 1} 月 · {weekdayFormatter.format(day.date)}
            </span>
            <span className={styles.dateMeta}>农历 · {day.lunarLabel}</span>
            {dayStatus && (
              <span className={styles.dateStatus} title={dayStatus}>
                {dayStatus}
              </span>
            )}
          </div>
        </div>
        <p className={styles.hint}>点击日历中的日期，查看这一天。</p>
      </div>

      <div className={styles.monthOverview}>
        <div className={styles.overviewHeading}>
          <div className={styles.overviewTitle}>
            <Flower2 className={styles.overviewIcon} aria-hidden='true' />
            <h2 className={styles.heading}>本月节日</h2>
          </div>
          <span className={styles.monthMeta}>
            {monthDays.length} 天 · {weekendCount} 个周末日
          </span>
        </div>
        {festivals.length > 0 ? (
          <div className={styles.festivals}>
            {festivals.map((festival) => (
              <Button
                key={festival.dateKey}
                className={styles.festivalButton}
                variant='ghost'
                type='button'
                aria-label={`${festival.day}日，${festival.traditionalFestival}`}
                aria-pressed={festival.dateKey === day.dateKey}
                onClick={() => onSelect(festival.dateKey)}
              >
                <span className={styles.festivalDate}>{festival.day} 日</span>
                {festival.traditionalFestival}
              </Button>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>本月暂无传统节日</p>
        )}
        <p className={styles.hint}>传统节日按农历标注，放假与补班以官方安排为准。</p>
        <div className={styles.zodiacOverview}>
          <div className={styles.overviewTitle}>
            <Sparkles className={styles.overviewIcon} aria-hidden='true' />
            <h2 className={styles.heading}>本月星座</h2>
          </div>
          <div className={styles.zodiacRanges}>
            {zodiacRanges.map((zodiac) => (
              <div
                key={zodiac.name}
                className={styles.zodiacRange}
                data-selected={
                  day.isCurrentMonth && day.day >= zodiac.startDay && day.day <= zodiac.endDay ? 'true' : undefined
                }
              >
                <span className={styles.zodiacSymbol} aria-hidden='true'>
                  {zodiac.symbol}
                </span>
                <span className={styles.zodiacName}>{zodiac.name}</span>
                <span className={styles.zodiacDates}>
                  {zodiac.startDay}–{zodiac.endDay} 日
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
