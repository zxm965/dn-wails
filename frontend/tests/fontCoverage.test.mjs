import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/features/font-patch/model/fontCoverage.ts', import.meta.url), 'utf8')
const { missingPreviewCharacters, coveragePercent } = vm.runInNewContext(
  `${stripTypeScriptTypes(source).replaceAll('export function', 'function')}\n({missingPreviewCharacters, coveragePercent})`,
)

test('preview checks actual characters, deduplicates, skips whitespace and handles non-BMP', () => {
  assert.equal(missingPreviewCharacters('龙A龙\n 😀😀𠮷\t', new Set([65, '𠮷'.codePointAt(0)])), '龙😀')
  assert.equal(missingPreviewCharacters('AA', new Set([65])), '')
})
test('incomplete coverage never rounds to 100%', () => {
  assert.equal(coveragePercent(21885, 21886), '99.99')
  assert.equal(coveragePercent(21886, 21886), '100.00')
})
