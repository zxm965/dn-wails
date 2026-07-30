import type { BadgeTone } from '@/shared/components/ui'

import type { WeeklyPlan, WeeklyPlanCommission, WeeklyPlanTicket } from '../api/dnSystemApi'

export const PRIORITY_OPTIONS = [
  { label: '大号', value: 0 },
  { label: '主力', value: 2 },
  { label: '小号', value: 1 },
] as const

export const NEST_OPTIONS = [
  { id: 1, label: '海龙' },
  { id: 2, label: '狮蝎' },
  { id: 3, label: 'K博士' },
  { id: 4, label: '大主教' },
  { id: 5, label: '巨人族' },
  { id: 6, label: '火山' },
  { id: 7, label: '守卫者' },
  { id: 8, label: '迷雾' },
  { id: 9, label: '台风金' },
  { id: 10, label: '卡伊伦' },
] as const

export const PROFESSION_OPTIONS = [
  { id: 1, label: '剑皇', group: '战士' },
  { id: 2, label: '月之领主', group: '战士' },
  { id: 3, label: '狂战士', group: '战士' },
  { id: 4, label: '毁灭者', group: '战士' },
  { id: 5, label: '黑暗复仇者', group: '战士' },
  { id: 6, label: '驭龙斗士', group: '战士' },
  { id: 7, label: '武器宗师', group: '战士' },
  { id: 8, label: '狙翎', group: '弓箭手' },
  { id: 9, label: '魔羽', group: '弓箭手' },
  { id: 10, label: '影舞者', group: '弓箭手' },
  { id: 11, label: '风行者', group: '弓箭手' },
  { id: 12, label: '银色猎人', group: '弓箭手' },
  { id: 13, label: '火舞', group: '魔法师' },
  { id: 14, label: '冰灵', group: '魔法师' },
  { id: 15, label: '时空领主', group: '魔法师' },
  { id: 16, label: '黑暗女王', group: '魔法师' },
  { id: 17, label: '黑暗死神', group: '魔法师' },
  { id: 18, label: '圣骑士', group: '牧师' },
  { id: 19, label: '十字军', group: '牧师' },
  { id: 20, label: '圣徒', group: '牧师' },
  { id: 21, label: '雷神', group: '牧师' },
  { id: 22, label: '黑暗教主', group: '牧师' },
  { id: 23, label: '重炮手', group: '学者' },
  { id: 24, label: '机械大师', group: '学者' },
  { id: 25, label: '炼金圣士', group: '学者' },
  { id: 26, label: '药剂师', group: '学者' },
  { id: 27, label: '银色机甲师', group: '学者' },
  { id: 28, label: '黑暗萨满', group: '舞娘' },
  { id: 29, label: '噬魂者', group: '舞娘' },
  { id: 30, label: '刀锋舞者', group: '舞娘' },
  { id: 31, label: '灵魂舞者', group: '舞娘' },
  { id: 32, label: '银色舞灵', group: '舞娘' },
  { id: 33, label: '烈', group: '刺客' },
  { id: 34, label: '影', group: '刺客' },
  { id: 35, label: '曜', group: '刺客' },
  { id: 36, label: '暗', group: '刺客' },
  { id: 37, label: '黑暗修罗', group: '刺客' },
  { id: 38, label: '皇家骑士', group: '萌骑士' },
  { id: 39, label: '魔枪骑士', group: '萌骑士' },
  { id: 40, label: '冰魂术士', group: '萌骑士' },
  { id: 41, label: '火灵术士', group: '萌骑士' },
  { id: 42, label: '黑暗破魔师', group: '萌骑士' },
  { id: 43, label: '御灵', group: '兽娘' },
  { id: 44, label: '破风', group: '兽娘' },
  { id: 45, label: '碎夜', group: '兽娘' },
  { id: 46, label: '驭光', group: '兽娘' },
  { id: 47, label: '银色兽灵', group: '兽娘' },
  { id: 48, label: '斩魄', group: '浪客' },
  { id: 49, label: '逐月', group: '浪客' },
  { id: 50, label: '霸刀', group: '浪客' },
  { id: 51, label: '烈刃', group: '浪客' },
  { id: 52, label: '魔幻大师', group: '魔术师' },
  { id: 53, label: '银色剑仙', group: '浪客' },
] as const

export const WEEKLY_FLAGS = [
  { key: 'hasInvasion', label: '侵蚀' },
  { key: 'hasArk', label: '方舟' },
  { key: 'hasNightmare', label: '噩梦' },
] as const

export type WeeklyFlagKey = (typeof WEEKLY_FLAGS)[number]['key']

export function priorityMeta(value: number): { label: string; tone: BadgeTone; rank: number } {
  const index = PRIORITY_OPTIONS.findIndex((option) => option.value === value)
  const resolved = PRIORITY_OPTIONS[index] ?? PRIORITY_OPTIONS[PRIORITY_OPTIONS.length - 1]
  const tones: BadgeTone[] = ['danger', 'accent', 'outline']
  return { label: resolved.label, tone: tones[index] ?? 'outline', rank: index < 0 ? PRIORITY_OPTIONS.length : index }
}

export function getNestLabel(id: number): string {
  return NEST_OPTIONS.find((item) => item.id === id)?.label ?? `未知巢穴 #${id}`
}

export function normalizeTicketDate(value: string): string {
  const match = value.trim().match(/^(?:\d{4}[-/.])?(\d{1,2})[-/.月](\d{1,2})日?$/)
  return match ? `${Number(match[1])}-${Number(match[2])}` : value.trim()
}

export function isValidTicketDate(value: string): boolean {
  const normalized = normalizeTicketDate(value)
  const match = normalized.match(/^(\d{1,2})-(\d{1,2})$/)
  if (!match) return false
  const month = Number(match[1])
  const day = Number(match[2])
  const date = new Date(Date.UTC(2024, month - 1, day))
  return month >= 1 && month <= 12 && day >= 1 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function taskProgress(plan: WeeklyPlan) {
  const completedCommissions = plan.nestCommissions.filter((item) => item.completed).length
  const completedFlags = WEEKLY_FLAGS.filter((flag) => plan[flag.key]).length
  const total = plan.nestCommissions.length + 1 + WEEKLY_FLAGS.length
  const completed = completedCommissions + Number(plan.levelCommissionCount > 0) + completedFlags
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
    missing: [
      plan.nestCommissions.length && completedCommissions < plan.nestCommissions.length
        ? `巢穴 ${completedCommissions}/${plan.nestCommissions.length}`
        : '',
      plan.levelCommissionCount > 0 ? '' : '每日疲劳',
      ...WEEKLY_FLAGS.map((flag) => (plan[flag.key] ? '' : flag.label)),
    ].filter(Boolean),
  }
}

function ticketDaysLeft(ticket: WeeklyPlanTicket, today: Date): number | null {
  const match = ticket.expiresAt.match(/^(\d{1,2})-(\d{1,2})$/)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const year = today.getFullYear()
  const expiry = new Date(year, month - 1, day)
  if (expiry.getMonth() !== month - 1 || expiry.getDate() !== day) return null
  const start = new Date(year, today.getMonth(), today.getDate()).getTime()
  return Math.floor((expiry.getTime() - start) / 86_400_000)
}

export function createDashboardSummary(plans: WeeklyPlan[], today = new Date()) {
  const progressItems = plans
    .map((plan) => ({ plan, ...taskProgress(plan) }))
    .sort((a, b) => priorityMeta(a.plan.priority).rank - priorityMeta(b.plan.priority).rank || a.percent - b.percent)
  const total = progressItems.reduce((sum, item) => sum + item.total, 0)
  const completed = progressItems.reduce((sum, item) => sum + item.completed, 0)
  const pending = progressItems.filter((item) => item.completed < item.total)
  const tickets = plans
    .flatMap((plan) =>
      plan.nestTickets.map((ticket, index) => {
        const daysLeft = ticketDaysLeft(ticket, today)
        return {
          key: `${plan.id}-${ticket.id}-${ticket.expiresAt}-${index}`,
          roleName: plan.roleName,
          nestLabel: getNestLabel(ticket.id),
          expiresAt: ticket.expiresAt,
          daysLeft,
        }
      }),
    )
    .filter((ticket) => ticket.daysLeft === null || ticket.daysLeft <= 3)
    .sort((a, b) => (a.daysLeft ?? -999) - (b.daysLeft ?? -999))

  return {
    planCount: plans.length,
    completedPlanCount: progressItems.filter((item) => item.total > 0 && item.completed >= item.total).length,
    weeklyProgress: { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 },
    pending,
    tickets,
  }
}

export function cloneCommissions(items: WeeklyPlanCommission[]): WeeklyPlanCommission[] {
  return items.map((item) => ({ ...item }))
}

export function cloneTickets(items: WeeklyPlanTicket[]): WeeklyPlanTicket[] {
  return items.map((item) => ({ ...item }))
}
