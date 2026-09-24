import { getHolidayDay, type HolidayDay } from '../data/chinaHolidays'

export const CALENDAR_MIN_YEAR = 1949
export const CALENDAR_MAX_YEAR = new Date().getFullYear() + 3

export interface CalendarDay {
  date: Date
  dateKey: string
  day: number
  lunarLabel: string
  traditionalFestival?: string
  holiday?: HolidayDay
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

interface LunarDate {
  month: string
  monthNumber: number
  day: number
  dayLabel: string
}

const lunarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  month: 'long',
  day: 'numeric',
})

const traditionalFestivals: Readonly<Record<string, string>> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '5-5': '端午节',
  '7-7': '七夕',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
}

const chineseMonths: Readonly<Record<string, number>> = {
  正月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  十一月: 11,
  冬月: 11,
  十二月: 12,
  腊月: 12,
}

const lunarDayLabels = [
  '',
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
] as const

export function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12)
}

function lunarDate(date: Date): LunarDate {
  const parts = lunarFormatter.formatToParts(date)
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const dayLabel = parts.find((part) => part.type === 'day')?.value.replace(/日$/, '') ?? ''
  const numericDay = Number(dayLabel)
  const namedDay = lunarDayLabels.findIndex((label) => label === dayLabel)
  const day = Number.isInteger(numericDay) && numericDay >= 1 && numericDay <= 30 ? numericDay : Math.max(namedDay, 0)
  const normalizedMonth = month.replace(/^闰/, '')

  return {
    month,
    monthNumber: chineseMonths[normalizedMonth] ?? 0,
    day,
    dayLabel,
  }
}

function getTraditionalFestival(date: Date, lunar: LunarDate): string | undefined {
  const festival = traditionalFestivals[`${lunar.monthNumber}-${lunar.day}`]
  if (festival) return festival

  const nextLunar = lunarDate(addDays(date, 1))
  if (lunar.monthNumber === 12 && nextLunar.monthNumber === 1 && nextLunar.day === 1) {
    return '除夕'
  }
  return undefined
}

function getLunarLabel(lunar: LunarDate): string {
  if (lunar.day === 1) return lunar.month
  return lunarDayLabels[lunar.day] || lunar.dayLabel
}

export function buildCalendarMonth(year: number, month: number, today = new Date()): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1, 12)
  const startDay = addDays(firstDay, -firstDay.getDay())
  const daysInMonth = new Date(year, month, 0, 12).getDate()
  const cellCount = Math.ceil((firstDay.getDay() + daysInMonth) / 7) * 7
  const todayKey = toDateKey(today)

  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(startDay, index)
    const dateKey = toDateKey(date)
    const lunar = lunarDate(date)
    return {
      date,
      dateKey,
      day: date.getDate(),
      lunarLabel: getLunarLabel(lunar),
      traditionalFestival: getTraditionalFestival(date, lunar),
      holiday: getHolidayDay(dateKey),
      isCurrentMonth: date.getFullYear() === year && date.getMonth() === month - 1,
      isToday: dateKey === todayKey,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    }
  })
}

export function shiftMonth(year: number, month: number, amount: number): { year: number; month: number } {
  const shifted = new Date(year, month - 1 + amount, 1, 12)
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}
