import {
  CalendarCheck,
  CalendarDays,
  Skull,
  Mails,
  NotebookPen,
  ListChecks,
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
        key: 'calendar',
        view: 'calendar',
        label: '日历',
        icon: CalendarDays,
        defaultVisible: true,
        preference: {
          description: '显示公历、农历，以及中国法定节假日和调休补班安排。',
        },
      },
      {
        key: 'quick-notes',
        view: 'quick-notes',
        label: '笔记',
        icon: NotebookPen,
        defaultVisible: true,
        preference: {
          description: '显示云端快速笔记、搜索、置顶和自动保存入口。',
        },
      },
      {
        key: 'tasks',
        view: 'tasks',
        label: '任务',
        icon: ListChecks,
        defaultVisible: true,
        preference: {
          description: '显示任务清单、星标、重复计划、子任务和完成记录。',
        },
      },
      {
        key: 'site-messages',
        view: 'site-messages',
        label: '消息',
        icon: Mails,
        defaultVisible: true,
        preference: {
          description: '显示独立的站内消息收件箱，可从右上角消息盒子跳转查看。',
        },
      },
      {
        key: 'dn-system',
        label: '龙之谷',
        icon: Sparkles,
        defaultVisible: false,
        defaultView: 'dn-weekly',
        preference: {
          description: '显示周常、角色和进程入口。',
        },
        children: [
          { key: 'dn-weekly', view: 'dn-weekly', label: '周常', icon: CalendarCheck },
          { key: 'dn-roles', view: 'dn-roles', label: '角色', icon: UsersRound },
          { key: 'dn-kill-process', view: 'dn-kill-process', label: '进程', icon: Skull },
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
        label: '设置',
        icon: Settings,
        defaultVisible: true,
      },
      {
        key: 'devtools',
        view: 'devtools',
        label: '实验室',
        icon: Wrench,
        defaultVisible: false,
        preference: {
          description: '显示文本工具与桌面能力验证入口。',
        },
      },
    ],
  },
] as const)

type ConfiguredGroup = (typeof MENU_GROUPS)[number]
type ConfiguredEntry = ConfiguredGroup['entries'][number]
type ParentEntry = Extract<ConfiguredEntry, { children: readonly unknown[] }>
export type MenuEntry =
  | Exclude<ConfiguredEntry, ParentEntry>
  | (Omit<ParentEntry, 'children'> & { children: readonly MenuItemDefinition[] })
export type MenuKey = ConfiguredEntry['key']
export type MenuVisibility = Readonly<Partial<Record<string, boolean>>>
export type MenuOrder = Readonly<Record<string, readonly string[]>>

export interface OrderedMenuGroup {
  key: string
  label?: string
  entries: MenuEntry[]
}

/** Ignore unknown keys and append newly added entries in their default order. */
export function orderMenuItems<Item extends { key: string }>(
  items: readonly Item[],
  order: readonly string[] = [],
): Item[] {
  const remaining = new Map(items.map((item) => [item.key, item]))
  const result: Item[] = []
  for (const key of order) {
    const item = remaining.get(key)
    if (!item) continue
    result.push(item)
    remaining.delete(key)
  }
  return [...result, ...remaining.values()]
}

export function getOrderedMenuGroups(order: MenuOrder = {}): OrderedMenuGroup[] {
  return MENU_GROUPS.map((group) => ({
    ...group,
    entries: orderMenuItems<MenuEntry>(group.entries, order[group.key]).map((entry) =>
      'children' in entry ? { ...entry, children: orderMenuItems(entry.children, order[entry.key]) } : entry,
    ),
  }))
}

export function resolveMenuVisibility(key: string, defaultVisible: boolean, visibility: MenuVisibility): boolean {
  return visibility[key] ?? defaultVisible
}

export function isMenuEntryVisible(entry: MenuEntry, visibility: MenuVisibility): boolean {
  return entry.key === 'settings' || resolveMenuVisibility(entry.key, entry.defaultVisible, visibility)
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

export function getFirstVisibleView(visibility: MenuVisibility, order: MenuOrder = {}): AppView {
  for (const group of getOrderedMenuGroups(order)) {
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
