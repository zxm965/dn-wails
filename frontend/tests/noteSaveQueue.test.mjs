import assert from 'node:assert/strict'
import test from 'node:test'

import { createNoteSaveQueue } from '../src/features/quick-notes/lib/noteSaveQueue.ts'

const note = (content, id = 1) => ({ id, title: '笔记', content, pinned: false, createdAt: '', updatedAt: '' })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('same-note saves are serialized and intermediate edits coalesced', async () => {
  const writes = []
  const queue = createNoteSaveQueue((value) => {
    const pending = deferred()
    writes.push({ value, ...pending })
    return pending.promise
  })
  const first = note('first')
  const last = note('last')
  queue.stage(first)
  const pending = queue.flush(first)
  queue.stage(note('intermediate'))
  queue.stage(last)
  assert.equal(queue.flush(last), pending)
  assert.equal(writes.length, 1)
  writes[0].resolve(first)
  await Promise.resolve()
  assert.equal(writes.length, 2)
  assert.equal(writes[1].value.content, 'last')
  writes[1].resolve(last)
  assert.equal((await pending).content, 'last')
  assert.equal(queue.drafts.size, 0)
})

test('failed writes retain the newest draft for an explicit retry', async () => {
  const firstWrite = deferred()
  let attempt = 0
  const queue = createNoteSaveQueue(async (value) => (++attempt === 1 ? firstWrite.promise : value))
  const pending = queue.flush(note('first'))
  queue.stage(note('newest'))
  firstWrite.reject(new Error('offline'))
  await assert.rejects(pending, /offline/)
  assert.equal(queue.drafts.get(1).content, 'newest')
  assert.equal(queue.errors.has(1), true)
  assert.equal((await queue.flush(note('stale caller'))).content, 'newest')
  assert.equal(queue.errors.has(1), false)
  assert.equal(queue.drafts.size, 0)
})

test('deletion waits for an in-flight write and does not submit queued edits', async () => {
  const write = deferred()
  const order = []
  const queue = createNoteSaveQueue(async (value) => {
    order.push('save')
    await write.promise
    return value
  })
  const pending = queue.flush(note('first'))
  queue.stage(note('pending'))
  const deleting = queue.remove(1, async () => {
    order.push('delete')
  })
  assert.deepEqual(order, ['save'])
  write.resolve()
  await Promise.all([pending, deleting])
  assert.deepEqual(order, ['save', 'delete'])
  assert.equal(queue.drafts.size, 0)
  assert.equal(queue.savedNotes.size, 0)
})

test('failed deletion preserves the unsaved draft', async () => {
  const queue = createNoteSaveQueue(async (value) => value)
  queue.stage(note('keep me'))
  await assert.rejects(
    queue.remove(1, async () => {
      throw new Error('offline')
    }),
    /offline/,
  )
  assert.equal(queue.drafts.get(1).content, 'keep me')
  assert.equal((await queue.flush(note('old'))).content, 'keep me')
})

test('separate account sessions never share drafts or save queues', async () => {
  const a = createNoteSaveQueue(async (value) => value)
  const b = createNoteSaveQueue(async (value) => value)
  a.stage(note('private'))
  assert.equal(b.drafts.size, 0)
  await b.flush(note('other', 2))
  assert.equal(a.drafts.get(1).content, 'private')
})
