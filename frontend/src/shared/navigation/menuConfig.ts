import {
  CalendarCheck,
  Skull,
  Mails,
  NotebookPen,
  Settings,
  Sparkles,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { isStandaloneAppView, type AppView } from './routeConfig'

interface MenuPreference {
  description: string
  children?: readonly MenuChildPreference[]
}

type MenuChildPreferenceKey = 'devtools-desktop'

interface MenuChildPreference {
  key: MenuChildPreferenceKey
  label: string
  description: string
  defaultVisible: boolean
}

interface MenuEntryBase {
  key: string
  label: string
  icon: LucideIcon
  defaultVisible: boolean
  preference?: MenuPreference
}

interface MenuItemDefinition {
  key: string
  view: AppView
  label: string
  icon: LucideIcon
}

interface DirectMenuEntryDefinition extends MenuEntryBase {
  view: AppView
  children?: never
}

interface ParentMenuEntryDefinition extends MenuEntryBase {
  defaultView: AppView
  children: readonly MenuItemDefinition[]
  view?: never
}

type MenuEntryDefinition = DirectMenuEntryDefinition | ParentMenuEntryDefinition

interface MenuGroupDefinition {
  key: string
  label?: string
  entries: readonly MenuEntryDefinition[]
}

function defineMenuGroups<const Groups extends readonly MenuGroupDefinition[]>(groups: Groups): Groups {
  const keys = new Set<string>()

  for (const group of groups) {
    if (keys.has(group.key)) {
      throw new Error(`Duplicate menu key: ${group.key}`)
    }
    keys.add(group.key)

    for (const entry of group.entries) {
      if (keys.has(entry.key)) {
        throw new Error(`Duplicate menu key: ${entry.key}`)
      }
      keys.add(entry.key)

      if ('children' in entry && entry.children) {
        for (const child of entry.children) {
          if (keys.has(child.key)) {
            throw new Error(`Duplicate menu key: ${child.key}`)
          }
          keys.add(child.key)
        }
      }

      if ('preference' in entry && entry.preference) {
        const preference: MenuPreference = entry.preference
        for (const child of preference.children ?? []) {
          if (keys.has(child.key)) {
            throw new Error(`Duplicate menu key: ${child.key}`)
          }
          keys.add(child.key)
        }
      }
    }
  }

  return groups
}

export const DEVTOOLS_DESKTOP_LAB_PREFERENCE = {
  key: 'devtools-desktop',
  label: '桌面实验室',
  description: '显示窗口、原生集成和系统通知的人工验证页签。',
  defaultVisible: false,
} as const satisfies MenuChildPreference

export const MENU_GROUPS = defineMenuGroups([
  {
    key: 'main-navigation',
    entries: [
      {
        key: 'quick-notes',
        view: 'quick-notes',
        label: '快速笔记',
        icon: NotebookPen,
        defaultVisible: true,
        preference: {
          description: '显示云端快速笔记、搜索、置顶和自动保存入口。',
        },
      },
      {
        key: 'site-messages',
        view: 'site-messages',
        label: '站内消息',
        icon: Mails,
        defaultVisible: true,
        preference: {
          description: '显示独立的站内消息收件箱，可从右上角消息盒子跳转查看。',
        },
      },
      {
        key: 'dn-system',
        label: 'DN惊鸿',
        icon: Sparkles,
        defaultVisible: false,
        defaultView: 'dn-weekly',
        preference: {
          description: '显示 Plan、Role 和 Kill 入口。',
        },
        children: [
          { key: 'dn-weekly', view: 'dn-weekly', label: 'Plan', icon: CalendarCheck },
          { key: 'dn-roles', view: 'dn-roles', label: 'Role', icon: UsersRound },
          { key: 'dn-kill-process', view: 'dn-kill-process', label: 'Kill', icon: Skull },
        ],
      },
    ],
  },
  {
    key: 'system-settings',
    label: '系统设置',
    entries: [
      {
        key: 'settings',
        view: 'settings',
        label: '偏好设置',
        icon: Settings,
        defaultVisible: true,
      },
      {
        key: 'devtools',
        view: 'devtools',
        label: 'DevTools',
        icon: Wrench,
        defaultVisible: false,
        preference: {
          description: '显示应用概览、运行状态和文本工具入口。',
          children: [DEVTOOLS_DESKTOP_LAB_PREFERENCE],
        },
      },
    ],
  },
] as const)

type ConfiguredGroup = (typeof MENU_GROUPS)[number]
export type MenuEntry = ConfiguredGroup['entries'][number]
export type MenuKey = MenuEntry['key']
export type MenuPreferenceKey = MenuKey | MenuChildPreferenceKey
export type MenuVisibility = Readonly<Partial<Record<string, boolean>>>

export interface ConfigurableMenuEntry {
  key: MenuKey
  label: string
  description: string
  defaultVisible: boolean
  children: readonly MenuChildPreference[]
}

export const CONFIGURABLE_MENU_ENTRIES: readonly ConfigurableMenuEntry[] = MENU_GROUPS.flatMap((group) =>
  group.entries.flatMap((entry) => {
    if (!('preference' in entry) || !entry.preference) return []
    const preference: MenuPreference = entry.preference
    return [
      {
        key: entry.key,
        label: entry.label,
        description: preference.description,
        defaultVisible: entry.defaultVisible,
        children: preference.children ?? [],
      },
    ]
  }),
)

export function resolveMenuVisibility(key: string, defaultVisible: boolean, visibility: MenuVisibility): boolean {
  return visibility[key] ?? defaultVisible
}

export function isMenuEntryVisible(entry: MenuEntry, visibility: MenuVisibility): boolean {
  return resolveMenuVisibility(entry.key, entry.defaultVisible, visibility)
}

export function isAppViewVisible(view: AppView, visibility: MenuVisibility): boolean {
  if (isStandaloneAppView(view)) {
    return true
  }
  for (const group of MENU_GROUPS) {
    for (const entry of group.entries) {
      if ('children' in entry && entry.children.some((child) => child.view === view)) {
        return isMenuEntryVisible(entry, visibility)
      }
      if ('view' in entry && entry.view === view) {
        return isMenuEntryVisible(entry, visibility)
      }
    }
  }

  return false
}

export function getFirstVisibleView(visibility: MenuVisibility): AppView {
  for (const group of MENU_GROUPS) {
    for (const entry of group.entries) {
      if (!isMenuEntryVisible(entry, visibility)) {
        continue
      }
      if ('children' in entry) {
        return entry.defaultView
      }
      return entry.view
    }
  }

  throw new Error('Navigation configuration must contain at least one visible menu entry.')
}
