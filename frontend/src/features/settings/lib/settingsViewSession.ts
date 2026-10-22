export type SettingsCategory = 'overview' | 'appearance' | 'menus' | 'notifications' | 'window'

// UI state only: retained in this WebView session, never written to application settings.
export const settingsViewSession: {
  category: SettingsCategory
  scrollOffsets: Partial<Record<SettingsCategory, number>>
  diagnosticsExpanded: boolean
} = { category: 'overview', scrollOffsets: {}, diagnosticsExpanded: false }
