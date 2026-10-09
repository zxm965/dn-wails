export interface MonthZodiacRange {
  name: string
  symbol: string
  startDay: number
  endDay: number
}

const zodiacTransitions = [
  { name: '水瓶座', symbol: '♒', startDay: 20 },
  { name: '双鱼座', symbol: '♓', startDay: 19 },
  { name: '白羊座', symbol: '♈', startDay: 21 },
  { name: '金牛座', symbol: '♉', startDay: 20 },
  { name: '双子座', symbol: '♊', startDay: 21 },
  { name: '巨蟹座', symbol: '♋', startDay: 21 },
  { name: '狮子座', symbol: '♌', startDay: 23 },
  { name: '处女座', symbol: '♍', startDay: 23 },
  { name: '天秤座', symbol: '♎', startDay: 23 },
  { name: '天蝎座', symbol: '♏', startDay: 23 },
  { name: '射手座', symbol: '♐', startDay: 22 },
  { name: '摩羯座', symbol: '♑', startDay: 22 },
] as const

export function getMonthZodiacRanges(date: Date): readonly MonthZodiacRange[] {
  const month = date.getMonth()
  const previous = zodiacTransitions[(month + 11) % 12]
  const current = zodiacTransitions[month]
  const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate()

  return [
    { name: previous.name, symbol: previous.symbol, startDay: 1, endDay: current.startDay - 1 },
    { name: current.name, symbol: current.symbol, startDay: current.startDay, endDay: lastDay },
  ]
}
