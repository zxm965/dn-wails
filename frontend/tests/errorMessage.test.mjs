import assert from 'node:assert/strict'
import test from 'node:test'

import { getErrorMessage } from '../src/shared/lib/errorMessage.ts'

test('error display preserves messages and falls back for empty or non-Error rejections', () => {
  const cases = [
    [new Error('数据库不可用'), '数据库不可用'],
    [new Error(''), '重试'],
    ['string rejection', '重试'],
    [{ message: 'untrusted object' }, '重试'],
    [null, '重试'],
    [undefined, '重试'],
  ]
  for (const [error, expected] of cases) {
    assert.equal(getErrorMessage(error, '重试'), expected)
  }
})
