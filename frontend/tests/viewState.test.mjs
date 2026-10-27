import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'

function loadHook(path, name, bindings) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace('export function', 'function')
  return vm.runInNewContext(`${stripTypeScriptTypes(source)}\n${name}`, bindings)
}

test('old requests and requests completed after unmount cannot publish', () => {
  let cleanup
  const hook = loadHook('../src/shared/hooks/useRequestGuard.ts', 'useRequestGuard', {
    useRef: (current) => ({ current }),
    useEffect: (effect) => {
      cleanup = effect()
    },
  })
  const begin = hook()
  const first = begin()
  const second = begin()
  assert.equal(first(), false)
  assert.equal(second(), true)
  cleanup()
  assert.equal(second(), false)
})

test('session state restores after remount, isolates keys and keeps functional updates', () => {
  const hook = loadHook('../src/shared/hooks/useSessionState.ts', 'useSessionState', {
    useState: (initial) => [initial(), () => {}],
  })
  const [, update] = hook('account:1', 0)
  update(7)
  update((current) => current + 1)
  assert.equal(hook('account:1', 0)[0], 8)
  assert.equal(hook('account:2', 0)[0], 0)
})

test('calendar refreshes at midnight and on resume, then releases listeners', () => {
  let now = new Date(2026, 9, 22, 23, 59, 59).getTime()
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]))
    }
  }
  let state
  let timer
  let cleanup
  const listeners = new Map()
  const target = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  }
  const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  const hook = loadHook('../src/features/calendar/hooks/useToday.ts', 'useToday', {
    Date: ClockDate,
    toDateKey: dateKey,
    useState: (initial) => {
      state = initial()
      return [
        state,
        (next) => {
          state = next(state)
        },
      ]
    },
    useEffect: (effect) => {
      cleanup = effect()
    },
    setTimeout: (callback, delay) => {
      timer = { callback, delay }
      return 1
    },
    clearTimeout: () => {
      timer = undefined
    },
    window: target,
    document: { ...target, hidden: false },
  })
  hook()
  assert.equal(timer.delay, 1050)
  now += 2000
  timer.callback()
  assert.equal(state.getDate(), 23)
  now += 86400000
  listeners.get('focus')()
  assert.equal(state.getDate(), 24)
  now += 86400000
  listeners.get('visibilitychange')()
  assert.equal(state.getDate(), 25)
  cleanup()
  assert.equal(listeners.size, 0)
  assert.equal(timer, undefined)
})
