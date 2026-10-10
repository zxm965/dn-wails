export interface AppRouteDefinition {
  path: string
  title: string
  requiresAuth: boolean
  navigation: 'menu' | 'standalone'
}

export const APP_ROUTES = {
  calendar: { path: '/calendar', title: '日历', requiresAuth: false, navigation: 'menu' },
  'quick-notes': { path: '/quick-notes', title: '笔记', requiresAuth: true, navigation: 'menu' },
  tasks: { path: '/tasks', title: '任务', requiresAuth: true, navigation: 'menu' },
  account: { path: '/account', title: '个人信息', requiresAuth: true, navigation: 'standalone' },
  'dn-weekly': { path: '/dn/weekly', title: '龙之谷 · 周常', requiresAuth: true, navigation: 'menu' },
  'dn-roles': { path: '/dn/roles', title: '龙之谷 · 角色', requiresAuth: true, navigation: 'menu' },
  'dn-kill-process': {
    path: '/dn/process',
    title: '龙之谷 · 进程',
    requiresAuth: false,
    navigation: 'menu',
  },
  'site-messages': { path: '/site-messages', title: '消息', requiresAuth: true, navigation: 'menu' },
  settings: { path: '/settings', title: '设置', requiresAuth: false, navigation: 'menu' },
  devtools: { path: '/devtools', title: '实验室', requiresAuth: false, navigation: 'menu' },
} as const satisfies Record<string, AppRouteDefinition>

export type AppView = keyof typeof APP_ROUTES
export const APP_VIEWS = Object.keys(APP_ROUTES) as AppView[]

export function getAppRoute(view: AppView): AppRouteDefinition {
  return APP_ROUTES[view]
}

export function getAppViewTitle(view: AppView): string {
  return getAppRoute(view).title
}

export function getAppViewPath(view: AppView): string {
  return getAppRoute(view).path
}

export function getAppViewFromPath(pathname: string): AppView | undefined {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return APP_VIEWS.find((view) => APP_ROUTES[view].path === normalizedPath)
}

export function appViewRequiresAuth(view: AppView): boolean {
  return getAppRoute(view).requiresAuth
}

export function isStandaloneAppView(view: AppView): boolean {
  return getAppRoute(view).navigation === 'standalone'
}
