import {
  CalendarCheck,
  Gauge,
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
    }
  }

  return groups
}

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
        label: 'DN 周常管理',
        icon: Sparkles,
        defaultVisible: false,
        defaultView: 'dn-dashboard',
        preference: {
          description: '显示 DN 仪表盘、周计划和角色管理入口。',
        },
        children: [
          { key: 'dn-dashboard', view: 'dn-dashboard', label: '仪表盘', icon: Gauge },
          { key: 'dn-weekly', view: 'dn-weekly', label: '周计划', icon: CalendarCheck },
          { key: 'dn-roles', view: 'dn-roles', label: '角色', icon: UsersRound },
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
          description: '显示应用概览、桌面能力验证和文本工具入口。',
        },
      },
    ],
  },
] as const)

type ConfiguredGroup = (typeof MENU_GROUPS)[number]
export type MenuEntry = ConfiguredGroup['entries'][number]
export type MenuKey = MenuEntry['key']
export type MenuVisibility = Readonly<Partial<Record<string, boolean>>>

export interface ConfigurableMenuEntry {
  key: MenuKey
  label: string
  description: string
  defaultVisible: boolean
}

export const CONFIGURABLE_MENU_ENTRIES: readonly ConfigurableMenuEntry[] = MENU_GROUPS.flatMap((group) =>
  group.entries.flatMap((entry) =>
    'preference' in entry
      ? [
          {
            key: entry.key,
            label: entry.label,
            description: entry.preference.description,
            defaultVisible: entry.defaultVisible,
          },
        ]
      : [],
  ),
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
