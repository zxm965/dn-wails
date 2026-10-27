import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import { parseSync } from '@babel/core'
import { transformWithOxc } from 'vite'

// Run uncompiled application functions so compiler caching cannot hide an Effect
// loop. Model state, dependency equality, cleanup and latest Effect Event callbacks;
// this is a lifecycle regression harness, not a DOM/native integration test.
async function mount(file, name, bindings = {}, initialProps = {}) {
  const slots = []
  const effects = []
  let cursor = 0
  let dirty = true
  let props = initialProps
  let result
  const hooks = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial }
        slot.set = (next) => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (!Object.is(value, slot.value)) {
            slot.value = value
            dirty = true
          }
        }
        slots[index] = slot
      }
      return [slots[index].value, slots[index].set]
    },
    useRef(initial) {
      const index = cursor++
      return (slots[index] ??= { current: initial })
    },
    useEffectEvent(callback) {
      const index = cursor++
      const slot = (slots[index] ??= {})
      slot.callback = callback
      // A fresh wrapper on every render deliberately exposes identity dependencies.
      return (...args) => slot.callback(...args)
    },
    useEffect(setup, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.()
          slots[index] = { deps, cleanup: setup() }
        })
      }
    },
    createContext: () => ({ Provider: 'Provider' }),
  }
  hooks.useLayoutEffect = hooks.useEffect
  const jsx = (type, props) => ({ type, props })
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
  let { code } = await transformWithOxc(source, file)
  const ast = parseSync(code, { configFile: false, babelrc: false })
  const context = { ...hooks, ...bindings }
  const edits = []
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const specifier of node.specifiers) {
        const imported = specifier.imported?.name ?? specifier.local.name
        context[specifier.local.name] =
          node.source.value === 'react/jsx-runtime'
            ? jsx
            : (context[imported] ??
              (node.source.value.includes('components/ui')
                ? imported
                : () => {
                    throw new Error(`Unmocked ${imported}`)
                  }))
      }
      edits.push([node.start, node.end])
    } else if (node.type === 'ExportNamedDeclaration') {
      edits.push([node.start, node.declaration.start])
    }
  }
  for (const [start, end] of edits.sort((a, b) => b[0] - a[0])) code = code.slice(0, start) + code.slice(end)
  const component = vm.runInNewContext(`${code}\n${name}`, context)
  const instance = {
    get result() {
      return result
    },
    async render(nextProps = props) {
      props = nextProps
      dirty = true
      for (let pass = 0; pass < 20; pass++) {
        if (dirty) {
          dirty = false
          cursor = 0
          result = component(props)
          for (const effect of effects.splice(0)) effect()
        }
        await new Promise(setImmediate)
        if (!dirty) return result
      }
      assert.fail(`${name} did not settle after 20 renders`)
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.()
    },
  }
  await instance.render()
  return instance
}

function eventBus() {
  const listeners = new Map()
  let subscriptions = 0
  let cleanups = 0
  return {
    listeners,
    get subscriptions() {
      return subscriptions
    },
    get cleanups() {
      return cleanups
    },
    On(name, callback) {
      subscriptions++
      listeners.set(name, callback)
      return () => {
        cleanups++
        listeners.delete(name)
      }
    },
  }
}

const feedback = { notify() {}, confirm: async () => true }
const errors = { getErrorMessage: (error, fallback) => error.message || fallback }

test('notification status initializes once and subscription reads the latest activation callback', async () => {
  const events = eventBus()
  let statusRequests = 0
  const activations = []
  const hook = await mount(
    'features/system-notification/hooks/useSystemNotification.ts',
    'useSystemNotification',
    {
      Events: events,
      getSystemNotificationStatus: async () => {
        statusRequests++
        return { available: true, authorized: true }
      },
    },
    { onActivated: () => activations.push('old') },
  )
  assert.equal(hook.result.capability, 'ready')
  await hook.render({ onActivated: () => activations.push('new') })
  events.listeners.get('system-notification:activated')({ data: { notificationId: '1' } })
  assert.deepEqual(activations, ['new'])
  assert.equal(statusRequests, 1)
  assert.equal(events.subscriptions, 1)
  hook.unmount()
  assert.equal(events.cleanups, 1)
})

test('account restore does not repeat after profile or parent renders', async () => {
  let restores = 0
  const provider = await mount('features/account/context/AccountProvider.tsx', 'AccountProvider', {
    ...errors,
    getAuthState: async () => {
      restores++
      return { authenticated: true, user: { id: 1 } }
    },
  })
  provider.result.props.value.setUser({ id: 1, name: 'Updated' })
  await provider.render()
  assert.equal(restores, 1)
  assert.equal(provider.result.props.value.user.name, 'Updated')
  provider.unmount()
})

test('settings load and subscribe once while external settings keep updating', async () => {
  const events = eventBus()
  let loads = 0
  const initial = {
    appearance: { themeMode: 'light' },
    notifications: {},
    navigation: { menuVisibility: {}, menuOrder: {} },
    window: {},
    dragonNest: {},
  }
  const media = { matches: false, addEventListener() {}, removeEventListener() {} }
  const provider = await mount('features/settings/context/SettingsProvider.tsx', 'SettingsProvider', {
    DEFAULT_SETTINGS: initial,
    loadSettings: async () => {
      loads++
      return initial
    },
    onSettingsChanged: (callback) => events.On('settings', callback),
    window: { matchMedia: () => media },
    document: { documentElement: { dataset: {} } },
  })
  await provider.render()
  events.listeners.get('settings')({ ...initial, appearance: { themeMode: 'dark' } })
  await provider.render()
  assert.equal(provider.result.props.value.settings.appearance.themeMode, 'dark')
  assert.equal(loads, 1)
  assert.equal(events.subscriptions, 1)
  provider.unmount()
  assert.equal(events.cleanups, 1)
})

test('update initialization and progress subscription do not restart on rerender', async () => {
  const events = eventBus()
  let infoRequests = 0
  let checks = 0
  const provider = await mount('features/app-update/context/AppUpdateProvider.tsx', 'AppUpdateProvider', {
    ...errors,
    Events: events,
    useFeedback: () => ({ ...feedback }),
    getApplicationUpdateInfo: async () => {
      infoRequests++
      return { configured: true, canInstall: true }
    },
    checkForApplicationUpdate: async () => {
      checks++
      return { updateAvailable: false }
    },
  })
  await provider.render()
  assert.equal(infoRequests, 1)
  assert.equal(checks, 1)
  assert.equal(events.subscriptions, 1)
  provider.unmount()
  assert.equal(events.cleanups, 1)
})

test('message polling follows account changes and does not reset on ordinary rerenders', async () => {
  const timers = new Map()
  let timerId = 0
  let user = { id: 1 }
  let syncs = 0
  let inboxRequests = 0
  const provider = await mount(
    'features/site-messages/context/SiteMessageProvider.tsx',
    'SiteMessageProvider',
    {
      ...errors,
      useAccount: () => ({ user }),
      useFeedback: () => ({ ...feedback }),
      checkOfficialMessagesOnLogin: async () => {
        syncs++
      },
      getMessageInbox: async () => {
        inboxRequests++
        return { items: [], unreadCount: 2, lastSyncedAt: 'now' }
      },
      claimMessageNotifications: async () => ({ items: [] }),
      window: {
        setInterval(callback) {
          timers.set(++timerId, callback)
          return timerId
        },
        clearInterval(id) {
          timers.delete(id)
        },
      },
    },
    { onNavigate() {} },
  )
  await provider.render()
  assert.equal(syncs, 1)
  assert.equal(inboxRequests, 1)
  assert.equal(provider.result.props.value.unreadCount, 2)
  assert.equal(timers.size, 1)
  timers.values().next().value()
  await provider.render()
  assert.equal(inboxRequests, 2)
  user = { id: 2 }
  await provider.render()
  assert.equal(syncs, 2)
  assert.equal(inboxRequests, 3)
  assert.equal(timers.size, 1)
  provider.unmount()
  assert.equal(timers.size, 0)
})

test('process scan and shortcut subscriptions survive rerenders and clean up', async () => {
  for (const kind of ['process', 'shortcut']) {
    const events = eventBus()
    const listeners = new Map()
    let requests = 0
    const common = {
      window: {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name) => listeners.delete(name),
      },
      getProcessErrorMessage: (error) => error.message,
    }
    const hook =
      kind === 'process'
        ? await mount('features/dn-system/hooks/useDnProcessList.ts', 'useDnProcessList', {
            ...common,
            PROCESS_CONTROL_SUPPORTED: true,
            listDragonNestProcesses: async () => {
              requests++
              return []
            },
            onDragonNestProcessesChanged: (callback) => events.On('changed', callback),
          })
        : await mount('features/dn-system/hooks/useDnShortcut.ts', 'useDnShortcut', {
            ...common,
            isWindows: () => false,
            getDragonNestShortcutStatus: async () => {
              requests++
              return { revision: requests, enabled: false }
            },
            onDragonNestShortcutChanged: (callback) => events.On('changed', callback),
          })
    await hook.render()
    assert.equal(requests, 1, kind)
    listeners.get('focus')()
    await hook.render()
    assert.equal(requests, 2, kind)
    assert.equal(events.subscriptions, 1, kind)
    hook.unmount()
    assert.equal(events.cleanups, 1, kind)
    assert.equal(listeners.size, 0, kind)
  }
})

test('reminder polling depends on capability and enabled state, not notification callback identity', async () => {
  const timers = new Map()
  let capability = 'ready'
  let sender = 'initial'
  let claims = 0
  const sent = []
  const monitor = await mount(
    'features/tasks/components/TaskReminderMonitor.tsx',
    'TaskReminderMonitor',
    {
      useSystemNotification: () => {
        const currentSender = sender
        return { capability, notifyMessage: async () => sent.push(currentSender) }
      },
      claimDueTaskReminders: async () => {
        claims++
        return [{ id: 1, title: 'Task' }]
      },
      window: {
        setInterval(callback) {
          timers.set(1, callback)
          return 1
        },
        clearInterval(id) {
          timers.delete(id)
        },
      },
    },
    { enabled: true, onOpenTasks() {} },
  )
  sender = 'latest'
  await monitor.render()
  assert.equal(claims, 1)
  timers.get(1)()
  await monitor.render()
  assert.deepEqual(sent, ['initial', 'latest'])
  capability = 'permission-required'
  await monitor.render()
  assert.equal(timers.size, 0)
  capability = 'ready'
  await monitor.render({ enabled: false, onOpenTasks() {} })
  assert.equal(claims, 2)
  monitor.unmount()
})

function findElement(element, type) {
  if (!element || typeof element !== 'object') return undefined
  if (element.type === type) return element
  for (const child of [element.props?.children].flat(Infinity)) {
    const found = findElement(child, type)
    if (found) return found
  }
}

test('role filters load once per applied change, while draft edits and parent renders do not fetch', async () => {
  const requests = []
  const panel = await mount('features/dn-system/components/DnRoles.tsx', 'DnRoles', {
    ...errors,
    useFeedback: () => ({ ...feedback }),
    useRequestGuard: () => () => () => true,
    styles: {},
    createScopedClassNames:
      () =>
      (...names) =>
        names.join(' '),
    PROFESSION_OPTIONS: [],
    PRIORITY_OPTIONS: [],
    DnFilterBar: 'DnFilterBar',
    listRoles: async (query) => {
      requests.push(query)
      return { items: [], meta: { page: 1 } }
    },
  })
  await panel.render()
  assert.equal(requests.length, 1)
  findElement(panel.result, 'DnFilterBar').props.onChange({ roleName: 'New role' })
  await panel.render()
  assert.equal(requests.length, 1)
  findElement(panel.result, 'DnFilterBar').props.onSearch({ preventDefault() {} })
  await panel.render()
  assert.equal(requests.length, 2)
  assert.equal(requests[1].roleName, 'New role')
  panel.unmount()
})

test('quick notes load once per session even when render callbacks change', async () => {
  let requests = 0
  const queue = { drafts: new Map(), errors: new Map(), savedNotes: new Map() }
  const panel = await mount('features/quick-notes/components/QuickNotesPanel.tsx', 'QuickNotesPanel', {
    ...errors,
    useAccount: () => ({ user: { id: 1 } }),
    useFeedback: () => ({ ...feedback }),
    useRequestGuard: () => () => () => true,
    styles: {},
    createScopedClassNames:
      () =>
      (...names) =>
        names.join(' '),
    getNoteSession: () => queue,
    listQuickNotes: async () => {
      requests++
      return []
    },
  })
  await panel.render()
  assert.equal(requests, 1)
  panel.unmount()
})
