import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/shared/interaction/confirmationRequests.ts', import.meta.url), 'utf8')
const create = vm.runInNewContext(
  `${stripTypeScriptTypes(source).replace('export function', 'function')}\ncreateConfirmationRequests`,
)

test('an old dialog exit cannot accept its replacement', async () => {
  const requests = create()
  const first = requests.start()
  const second = requests.start()
  assert.equal(await first.promise, false)
  assert.equal(requests.finish(first.id, true), false)
  let settled = false
  second.promise.then(() => {
    settled = true
  })
  await Promise.resolve()
  assert.equal(settled, false)
  assert.equal(requests.finish(second.id, false), true)
  assert.equal(await second.promise, false)
})

test('confirmation resolves once and unmount cancels the outstanding request', async () => {
  const requests = create()
  const accepted = requests.start()
  assert.equal(requests.finish(accepted.id, true), true)
  assert.equal(requests.finish(accepted.id, false), false)
  assert.equal(await accepted.promise, true)
  const next = requests.start()
  requests.cancel()
  assert.equal(await next.promise, false)
  assert.equal(requests.finish(next.id, true), false)
})
