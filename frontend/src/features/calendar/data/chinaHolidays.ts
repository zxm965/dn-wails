export type HolidayStatus = 'holiday' | 'workday'

export interface HolidayDay {
  name: string
  status: HolidayStatus
}

interface HolidayPeriod {
  name: string
  start: string
  end: string
}

interface HolidayScheduleDefinition {
  sourceTitle: string
  sourceUrl: string
  periods: readonly HolidayPeriod[]
  workdays: Readonly<Record<string, string>>
}

export type HolidayScheduleInfo = { available: true; sourceTitle: string; sourceUrl: string } | { available: false }

const holidaySchedules: Readonly<Record<number, HolidayScheduleDefinition>> = {
  2024: {
    sourceTitle: '国务院办公厅关于2024年部分节假日安排的通知',
    sourceUrl: 'https://www.gov.cn/zhengce/content/202310/content_6911527.htm',
    periods: [
      { name: '元旦', start: '2024-01-01', end: '2024-01-01' },
      { name: '春节', start: '2024-02-10', end: '2024-02-17' },
      { name: '清明节', start: '2024-04-04', end: '2024-04-06' },
      { name: '劳动节', start: '2024-05-01', end: '2024-05-05' },
      { name: '端午节', start: '2024-06-08', end: '2024-06-10' },
      { name: '中秋节', start: '2024-09-15', end: '2024-09-17' },
      { name: '国庆节', start: '2024-10-01', end: '2024-10-07' },
    ],
    workdays: {
      '2024-02-04': '春节调休',
      '2024-02-18': '春节调休',
      '2024-04-07': '清明节调休',
      '2024-04-28': '劳动节调休',
      '2024-05-11': '劳动节调休',
      '2024-09-14': '中秋节调休',
      '2024-09-29': '国庆节调休',
      '2024-10-12': '国庆节调休',
    },
  },
  2025: {
    sourceTitle: '国务院办公厅关于2025年部分节假日安排的通知',
    sourceUrl: 'https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm',
    periods: [
      { name: '元旦', start: '2025-01-01', end: '2025-01-01' },
      { name: '春节', start: '2025-01-28', end: '2025-02-04' },
      { name: '清明节', start: '2025-04-04', end: '2025-04-06' },
      { name: '劳动节', start: '2025-05-01', end: '2025-05-05' },
      { name: '端午节', start: '2025-05-31', end: '2025-06-02' },
      { name: '国庆节·中秋节', start: '2025-10-01', end: '2025-10-08' },
    ],
    workdays: {
      '2025-01-26': '春节调休',
      '2025-02-08': '春节调休',
      '2025-04-27': '劳动节调休',
      '2025-09-28': '国庆节、中秋节调休',
      '2025-10-11': '国庆节、中秋节调休',
    },
  },
  2026: {
    sourceTitle: '国务院办公厅关于2026年部分节假日安排的通知',
    sourceUrl: 'https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm',
    periods: [
      { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
      { name: '春节', start: '2026-02-15', end: '2026-02-23' },
      { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
      { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
      { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
      { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
      { name: '国庆节', start: '2026-10-01', end: '2026-10-07' },
    ],
    workdays: {
      '2026-01-04': '元旦调休',
      '2026-02-14': '春节调休',
      '2026-02-28': '春节调休',
      '2026-05-09': '劳动节调休',
      '2026-09-20': '国庆节调休',
      '2026-10-10': '国庆节调休',
    },
  },
}

function addOneDay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1, 12)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function createHolidayDays(): ReadonlyMap<string, HolidayDay> {
  const days = new Map<string, HolidayDay>()

  for (const schedule of Object.values(holidaySchedules)) {
    for (const period of schedule.periods) {
      let dateKey = period.start
      while (dateKey <= period.end) {
        days.set(dateKey, { name: period.name, status: 'holiday' })
        dateKey = addOneDay(dateKey)
      }
    }
    for (const [dateKey, name] of Object.entries(schedule.workdays)) {
      days.set(dateKey, { name, status: 'workday' })
    }
  }

  return days
}

const holidayDays = createHolidayDays()

export function getHolidayDay(dateKey: string): HolidayDay | undefined {
  return holidayDays.get(dateKey)
}

export function getHolidayScheduleInfo(year: number): HolidayScheduleInfo {
  const schedule = holidaySchedules[year]
  return schedule
    ? { available: true, sourceTitle: schedule.sourceTitle, sourceUrl: schedule.sourceUrl }
    : { available: false }
}

export const OFFICIAL_HOLIDAY_YEARS = Object.keys(holidaySchedules).map(Number)
