import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/features/font-patch/model/fontName.ts', import.meta.url), 'utf8')
const getFontDisplayName = vm.runInNewContext(
  `${stripTypeScriptTypes(source).replace('export function', 'function')}\ngetFontDisplayName`,
)

test('garbled font metadata falls back to the uploaded filename', () => {
  assert.equal(
    getFontDisplayName({ fontName: '®¨?®§?®¶?', sourceName: '1610510478683810.ttf', sha256: '' }),
    '1610510478683810',
  )
  assert.equal(getFontDisplayName({ fontName: '\ufffd\ufffd', sourceName: '清晰中文.otf', sha256: '' }), '清晰中文')
})

test('unreadable metadata and filename use a short stable identifier', () => {
  assert.equal(getFontDisplayName({ fontName: '\u0000', sourceName: '???.ttf', sha256: 'a1b2c3d4' }), 'font-a1b2c3d4')
  assert.equal(getFontDisplayName({ fontName: '', sourceName: '.ttf', sha256: '' }), 'font')
})

test('valid Chinese, Latin and accented names are preserved', () => {
  for (const fontName of ['思源宋体 Regular', 'Noto Sans CJK SC', 'École (Regular)', '楷体']) {
    assert.equal(getFontDisplayName({ fontName, sourceName: 'font.ttf', sha256: '' }), fontName)
  }
})
