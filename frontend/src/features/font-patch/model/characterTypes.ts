import type { CompositionRequest } from '../api/compositionApi'

export const characterTypes = [
  { key: 'numbers', bit: 1, label: '数字', sample: '0123456789', description: '含全角数字及其他 Unicode 数字' },
  { key: 'letters', bit: 2, label: '字母', sample: 'ABCDEF abcdef', description: 'A–Z / a–z，含全角英文字母' },
  { key: 'text', bit: 4, label: '汉字', sample: '龙之谷 冒险从这里开始', description: '汉字及 CJK 扩展、兼容汉字' },
  { key: 'symbols', bit: 8, label: '符号', sample: '，。！？＋－×÷￥% @#', description: 'Unicode 标点与符号' },
] as const
export type CharacterKey = (typeof characterTypes)[number]['key']
export function includesScope(scope: number, bit: number) {
  return scope === 16 || (scope & bit) !== 0
}
export function setScope(scope: number, bit: number, enabled: boolean) {
  const mask = scope === 16 ? 15 : scope
  return enabled ? mask | bit : mask & ~bit
}
export function characterKind(point: number): CharacterKey | 'other' {
  const character = String.fromCodePoint(point)
  if (/\p{N}/u.test(character)) return 'numbers'
  if (/[A-Za-zＡ-Ｚａ-ｚ]/u.test(character)) return 'letters'
  if (
    /\p{Unified_Ideograph}/u.test(character) ||
    point === 0x3007 ||
    (point >= 0xf900 && point <= 0xfaff) ||
    (point >= 0x2f800 && point <= 0x2fa1f)
  )
    return 'text'
  if (/[\p{P}\p{S}]/u.test(character)) return 'symbols'
  return 'other'
}
export function sameComposition(a: CompositionRequest | null | undefined, b: CompositionRequest) {
  return (
    !!a &&
    a.fontAId === b.fontAId &&
    a.fontBId === b.fontBId &&
    a.replacementScope === b.replacementScope &&
    a.adjustmentScope === b.adjustmentScope &&
    a.options.scalePercent === b.options.scalePercent &&
    a.options.weight === b.options.weight
  )
}
