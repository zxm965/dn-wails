export interface AppRouteDefinition {
  title: string
  requiresAuth: boolean
  navigation: 'menu' | 'standalone'
}

export const APP_ROUTES = {
  'quick-notes': { title: '快速笔记', requiresAuth: true, navigation: 'menu' },
  account: { title: '个人信息', requiresAuth: true, navigation: 'standalone' },
  'dn-weekly': { title: 'DN Tools · 周常', requiresAuth: true, navigation: 'menu' },
  'dn-roles': { title: 'DN Tools · 角色', requiresAuth: true, navigation: 'menu' },
  'dn-kill-process': { title: 'DN Tools · 进程', requiresAuth: false, navigation: 'menu' },
  'site-messages': { title: '站内消息', requiresAuth: true, navigation: 'menu' },
  settings: { title: '偏好设置', requiresAuth: false, navigation: 'menu' },
  devtools: { title: 'DevTools', requiresAuth: false, navigation: 'menu' },
} as const satisfies Record<string, AppRouteDefinition>

export type AppView = keyof typeof APP_ROUTES

export function getAppRoute(view: AppView): AppRouteDefinition {
  return APP_ROUTES[view]
}

export function getAppViewTitle(view: AppView): string {
  return getAppRoute(view).title
}

export function appViewRequiresAuth(view: AppView): boolean {
  return getAppRoute(view).requiresAuth
}

export function isStandaloneAppView(view: AppView): boolean {
  return getAppRoute(view).navigation === 'standalone'
}
