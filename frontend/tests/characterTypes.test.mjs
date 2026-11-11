import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/features/font-patch/model/characterTypes.ts', import.meta.url), 'utf8')
const helpers = vm.runInNewContext(
  `${stripTypeScriptTypes(source).replaceAll('export ', '')}\n({ includesScope, setScope, characterKind, sameComposition })`,
)
test('character categories separate numbers, fullwidth letters, Han and symbols', () => {
  for (const [character, kind] of [
    ['1', 'numbers'],
    ['①', 'numbers'],
    ['〇', 'numbers'],
    ['Ａ', 'letters'],
    ['中', 'text'],
    ['𠀀', 'text'],
    ['！', 'symbols'],
    [' ', 'other'],
  ])
    assert.equal(helpers.characterKind(character.codePointAt(0)), kind)
  assert.equal(helpers.setScope(16, 2, false), 13)
  assert.equal(helpers.includesScope(16, 8), true)
  assert.equal(helpers.includesScope(1, 2), false)
})
test('source, scope or adjustment changes invalidate a confirmed composition', () => {
  const request = {
    fontAId: 'a',
    fontBId: 'b',
    replacementScope: 3,
    adjustmentScope: 2,
    options: { scalePercent: 110, weight: 1 },
  }
  assert.equal(helpers.sameComposition({ ...request }, request), true)
  for (const change of [
    { fontAId: 'new' },
    { fontBId: 'new' },
    { replacementScope: 2 },
    { adjustmentScope: 3 },
    { options: { scalePercent: 100, weight: 1 } },
    { options: { scalePercent: 110, weight: 0 } },
  ])
    assert.equal(helpers.sameComposition({ ...request, ...change }, request), false)
})
