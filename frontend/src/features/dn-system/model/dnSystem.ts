import type { BadgeTone } from '@/shared/components/ui'

export const PRIORITY_OPTIONS = [
  { label: '大号', value: 0 },
  { label: '主力', value: 2 },
  { label: '小号', value: 1 },
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
