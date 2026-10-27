import { useRef } from 'react'

import { useAppUpdate } from '@/features/app-update'
import { Button, PageTabs, RadioGroup, Select, Switch, type PageTab } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { FONT_SIZE_PRESETS, type FontSizePreset } from '@/shared/theme/typography'

import { type AccentColor, type AppSettings, type ButtonSize, type ThemeMode } from '../api/settingsApi'
import { useSettings } from '../context/SettingsProvider'
import { useSettingsViewState } from '../hooks/useSettingsViewState'
import type { SettingsCategory } from '../lib/settingsViewSession'
import { MenuPreferences } from './MenuPreferences'
import { RuntimeStatusPanel, type SettingsPreferenceCategory } from './RuntimeStatusPanel'

import { styles } from './SettingsPanel.css'

const cx = createScopedClassNames(styles)

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const ACCENT_OPTIONS: Array<{ value: AccentColor; label: string }> = [
  { value: 'green', label: '绿色' },
  { value: 'blue', label: '蓝色' },
  { value: 'purple', label: '紫色' },
  { value: 'orange', label: '橙色' },
]

const BUTTON_SIZE_OPTIONS: Array<{ value: ButtonSize; label: string }> = [
  { value: 'sm', label: '小型' },
  { value: 'md', label: '标准' },
  { value: 'lg', label: '大型' },
]

export function SettingsPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { settings, isLoading, isSaving, error: settingsError, updateSettings, resetSettings } = useSettings()
  const { activeCategory, selectCategory } = useSettingsViewState(panelRef, !isLoading)
  const {
    info: updateInfo,
    status: updateStatus,
    error: updateError,
    isLoading: isUpdateLoading,
    isChecking,
    isInstalling,
    progress: updateProgress,
    checkForUpdates,
    showReleaseNotes,
  } = useAppUpdate()
  const { notify, confirm } = useFeedback()

  const updateSummary = isUpdateLoading
    ? '正在读取版本信息'
    : updateStatus?.updateAvailable
      ? `发现新版本 ${updateStatus.latestVersion}`
      : updateStatus
        ? '已是最新版'
        : updateInfo?.configured
          ? '启动时自动检查更新'
          : '开发构建未启用更新'

  function openPreferences(category: SettingsPreferenceCategory) {
    selectCategory(category, true)
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
    })
  }

  function updateAppearance<Key extends keyof AppSettings['appearance']>(
    key: Key,
    value: AppSettings['appearance'][Key],
  ) {
    void updateSettings((current) => ({
      ...current,
      appearance: { ...current.appearance, [key]: value },
    })).catch(() => undefined)
  }

  function updateNotifications<Key extends keyof AppSettings['notifications']>(
    key: Key,
    value: AppSettings['notifications'][Key],
  ) {
    void updateSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    })).catch(() => undefined)
  }

  function updateWindow<Key extends keyof AppSettings['window']>(key: Key, value: AppSettings['window'][Key]) {
    void updateSettings((current) => ({
      ...current,
      window: { ...current.window, [key]: value },
    })).catch(() => undefined)
  }

  async function handleReset() {
    const accepted = await confirm({
      title: '恢复全部默认设置',
      message:
        '全部偏好将恢复默认，包括外观、菜单顺序与显隐、通知、窗口以及龙之谷快捷键和路径设置。业务数据不会删除，是否继续？',
      confirmLabel: '全部恢复',
      tone: 'danger',
    })
    if (!accepted) {
      return
    }

    try {
      await resetSettings()
      notify({ title: '已恢复默认设置', tone: 'success' })
    } catch {
      notify({ title: '恢复失败', tone: 'error' })
    }
  }

  if (isLoading) {
    return <div className={cx('settings-panel settings-state')}>正在读取应用设置…</div>
  }

  const tabs: PageTab<SettingsCategory>[] = [
    {
      value: 'overview',
      label: '概览',
      description: '版本、运行与更新',
      content: (
        <div className={styles.overview}>
          <RuntimeStatusPanel onOpenSettings={openPreferences} />
          <section className={cx('settings-section', 'updateSection')}>
            <div className={cx('settings-section-title')}>
              <h2>应用更新</h2>
              <p>启动时会自动检查正式版本，也可以在这里手动检查最新版本。</p>
            </div>
            <div className={cx('settings-update-content')}>
              <div>
                <strong>{updateSummary}</strong>
                {updateError && (
                  <p className={cx('settings-update-error')} role='alert'>
                    {updateError}
                  </p>
                )}
                {updateProgress && (
                  <div className={cx('settings-update-progress')} aria-live='polite'>
                    <span>
                      {updateProgress.phase === 'downloading'
                        ? `正在下载更新 ${updateProgress.percent}%`
                        : '下载完成，正在准备自动安装并重启…'}
                    </span>
                    <progress
                      className={cx('settings-update-progress-bar')}
                      max={100}
                      value={updateProgress.percent}
                      aria-label='应用更新下载进度'
                    />
                    <small>
                      {formatBytes(updateProgress.downloadedBytes)} / {formatBytes(updateProgress.totalBytes)}
                    </small>
                  </div>
                )}
              </div>
              <div className={styles.updateActions}>
                <Button
                  type='button'
                  variant='outline'
                  disabled={!updateStatus || isChecking || isInstalling}
                  onClick={showReleaseNotes}
                >
                  查看更新日志
                </Button>
                <Button
                  type='button'
                  variant={updateStatus?.updateAvailable ? 'primary' : 'outline'}
                  disabled={isUpdateLoading || isChecking || isInstalling || !updateInfo?.configured}
                  onClick={() => void checkForUpdates(true)}
                >
                  {isInstalling ? '正在安装…' : isChecking ? '正在检查…' : '检查最新版'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ),
    },
    {
      value: 'appearance',
      label: '外观',
      description: '主题、配色与文字',
      content: (
        <section className={cx('settings-section')}>
          <div className={cx('settings-section-title')}>
            <h2>主题与外观</h2>
            <p>控制应用配色、强调色、界面密度、默认按钮尺寸和全局默认字号组合。</p>
          </div>

          <div className={cx('settings-grid')}>
            <fieldset className={cx('settings-fieldset')}>
              <legend>主题模式</legend>
              <RadioGroup
                aria-label='主题模式'
                className={styles.compactOptions}
                name='theme-mode'
                value={settings.appearance.themeMode}
                options={THEME_OPTIONS}
                onValueChange={(themeMode) => updateAppearance('themeMode', themeMode)}
              />
            </fieldset>

            <fieldset className={cx('settings-fieldset')}>
              <legend>强调色</legend>
              <RadioGroup
                aria-label='强调色'
                name='accent-color'
                variant='chips'
                value={settings.appearance.accent}
                options={ACCENT_OPTIONS.map((option) => ({
                  ...option,
                  title: option.label,
                  leading: <span className={cx(`settings-accent is-${option.value}`)} />,
                }))}
                onValueChange={(accent) => updateAppearance('accent', accent)}
              />
            </fieldset>

            <label className={cx('settings-field')}>
              <span>界面密度</span>
              <Select
                aria-label='界面密度'
                value={settings.appearance.density}
                options={[
                  { value: 'comfortable', label: '舒适 · 标准留白' },
                  { value: 'compact', label: '紧凑 · 减少留白' },
                ]}
                onValueChange={(density) => updateAppearance('density', density)}
              />
            </label>

            <fieldset className={cx('settings-fieldset')}>
              <legend>默认按钮尺寸</legend>
              <div className={cx('settings-button-size-options')} role='group' aria-label='默认按钮尺寸'>
                {BUTTON_SIZE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type='button'
                    size={option.value}
                    variant={settings.appearance.buttonSize === option.value ? 'secondary' : 'outline'}
                    ripple={false}
                    className={cx(
                      'settings-button-size-button',
                      settings.appearance.buttonSize === option.value
                        ? 'settings-button-size-button-selected'
                        : undefined,
                    )}
                    aria-pressed={settings.appearance.buttonSize === option.value}
                    onClick={() => updateAppearance('buttonSize', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>

            <fieldset className={cx('settings-fieldset')}>
              <legend>全局默认字号组合</legend>
              <RadioGroup<FontSizePreset>
                aria-label='全局默认字号组合'
                className={styles.compactOptions}
                name='font-size-preset'
                value={settings.appearance.fontSizePreset}
                options={Object.entries(FONT_SIZE_PRESETS).map(([value, preset]) => ({
                  value: value as FontSizePreset,
                  label: preset.label,
                }))}
                onValueChange={(preset) => updateAppearance('fontSizePreset', preset)}
              />
              <div className={styles.fontPreview}>
                <strong className={styles.fontPreviewTitle}>
                  标题示例 · {FONT_SIZE_PRESETS[settings.appearance.fontSizePreset].sizes.title}px
                </strong>
                <span className={styles.fontPreviewBody}>
                  正文示例 · {FONT_SIZE_PRESETS[settings.appearance.fontSizePreset].sizes.body}px
                </span>
                <span className={styles.fontPreviewDescription}>
                  辅助说明 · {FONT_SIZE_PRESETS[settings.appearance.fontSizePreset].sizes.secondary}px
                </span>
              </div>
              <p className={styles.fontPreviewDescription}>统一应用于菜单、页面、表单和弹窗中的文字。</p>
            </fieldset>
          </div>
        </section>
      ),
    },
    {
      value: 'menus',
      label: '菜单',
      description: '功能入口与显隐',
      content: <MenuPreferences />,
    },
    {
      value: 'notifications',
      label: '通知',
      description: '消息预览与免打扰',
      content: (
        <section className={cx('settings-section')}>
          <div className={cx('settings-section-title')}>
            <h2>系统通知</h2>
            <p>控制应用是否发送通知以及是否展示消息正文。</p>
          </div>
          <div className={cx('settings-toggles')}>
            <ToggleRow
              title='启用系统通知'
              description='关闭后，业务消息不会发送到系统通知中心。'
              checked={settings.notifications.enabled}
              onChange={(checked) => updateNotifications('enabled', checked)}
            />
            <ToggleRow
              title='显示消息预览'
              description='关闭后，通知正文统一显示“您收到一条消息”。'
              checked={settings.notifications.showPreview}
              disabled={!settings.notifications.enabled}
              onChange={(checked) => updateNotifications('showPreview', checked)}
            />
            <ToggleRow
              title='免打扰'
              description='临时暂停所有应用消息通知。'
              checked={settings.notifications.doNotDisturb}
              disabled={!settings.notifications.enabled}
              onChange={(checked) => updateNotifications('doNotDisturb', checked)}
            />
          </div>
        </section>
      ),
    },
    {
      value: 'window',
      label: '窗口',
      description: '关闭行为与状态记忆',
      content: (
        <section className={cx('settings-section')}>
          <div className={cx('settings-section-title')}>
            <h2>窗口行为</h2>
            <p>窗口位置和大小会在正常关闭时保存。</p>
          </div>
          <div className={cx('settings-grid')}>
            <label className={cx('settings-field')}>
              <span>关闭窗口时</span>
              <Select
                aria-label='关闭窗口时'
                value={settings.window.closeBehavior}
                options={[
                  { value: 'quit', label: '退出应用' },
                  { value: 'hide', label: '隐藏到后台' },
                ]}
                onValueChange={(closeBehavior) => updateWindow('closeBehavior', closeBehavior)}
              />
            </label>
          </div>
          <div className={cx('settings-toggles')}>
            <ToggleRow
              title='窗口始终置顶'
              description='切换后立即应用到主窗口。'
              checked={settings.window.alwaysOnTop}
              onChange={(checked) => updateWindow('alwaysOnTop', checked)}
            />
            <ToggleRow
              title='记住窗口位置和大小'
              description='下次启动时恢复上次关闭前的窗口状态。'
              checked={settings.window.rememberBounds}
              onChange={(checked) => updateWindow('rememberBounds', checked)}
            />
          </div>
        </section>
      ),
    },
  ]

  return (
    <div ref={panelRef} className={cx('settings-panel')}>
      <header className={styles.header}>
        <h1 className={styles.title}>设置</h1>
        <div
          className={styles.headerActions}
          data-hidden={activeCategory === 'overview'}
          aria-hidden={activeCategory === 'overview'}
          inert={activeCategory === 'overview'}
        >
          <span className={cx('settings-save-status')} aria-live='polite'>
            {isSaving ? '正在同步…' : '修改后自动保存'}
          </span>
          <Button variant='outline' onClick={handleReset} disabled={isSaving}>
            恢复全部默认设置
          </Button>
        </div>
      </header>

      {settingsError && (
        <p className={cx('settings-error')} role='alert'>
          {settingsError}
        </p>
      )}

      <PageTabs label='设置分类' tabs={tabs} value={activeCategory} onValueChange={selectCategory} />
    </div>
  )
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  if (value < 1024) return `${Math.round(value)} B`
  const units = ['KB', 'MB', 'GB']
  let amount = value
  let unit = 'B'
  for (const nextUnit of units) {
    amount /= 1024
    unit = nextUnit
    if (amount < 1024 || nextUnit === units[units.length - 1]) break
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${unit}`
}

interface ToggleRowProps {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ title, description, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className={cx(`settings-toggle-row${disabled ? ' is-disabled' : ''}`)}>
      <span className={cx('settings-toggle-text')}>
        <strong className={cx('settings-toggle-title')}>{title}</strong>
        <small className={cx('settings-toggle-description')}>{description}</small>
      </span>
      <Switch aria-label={title} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  )
}
