import { useAppUpdate } from '@/features/app-update'
import { Button, PageHeader, RadioGroup, Select, Slider, Switch } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { CONFIGURABLE_MENU_ENTRIES, resolveMenuVisibility, type MenuPreferenceKey } from '@/shared/navigation'

import { type AccentColor, type AppSettings, type ButtonSize, type ThemeMode } from '../api/settingsApi'
import { useSettings } from '../context/SettingsProvider'

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
  const { settings, isLoading, isSaving, error: settingsError, updateSettings, resetSettings } = useSettings()
  const {
    info: updateInfo,
    status: updateStatus,
    error: updateError,
    isLoading: isUpdateLoading,
    isChecking,
    isInstalling,
    progress: updateProgress,
    checkForUpdates,
  } = useAppUpdate()
  const { notify, confirm } = useFeedback()

  const updateSummary = isUpdateLoading
    ? '正在读取版本信息'
    : updateStatus?.updateAvailable
      ? `发现新版本 ${updateStatus.latestVersion}`
      : updateStatus
        ? `当前已是最新版 ${updateStatus.currentVersion}`
        : updateInfo?.configured
          ? '启动时自动检查更新'
          : '开发构建未启用更新'

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

  function updateMenuVisibility(key: MenuPreferenceKey, visible: boolean) {
    void updateSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        menuVisibility: { ...current.navigation.menuVisibility, [key]: visible },
      },
    })).catch(() => undefined)
  }

  async function handleReset() {
    const accepted = await confirm({
      title: '恢复默认设置',
      message: '主题、菜单、通知和窗口设置都会恢复默认值，是否继续？',
      confirmLabel: '恢复默认',
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

  return (
    <div className={cx('settings-panel')}>
      <PageHeader
        eyebrow='Preferences'
        title='设置与外观'
        subtitle='设置会保存到当前用户的应用配置目录。'
        actions={
          <>
            <span className={cx('settings-save-status')} aria-live='polite'>
              {isSaving ? '正在同步…' : '修改后自动保存'}
            </span>
            <Button
              className={cx('settings-button settings-button-secondary')}
              variant='outline'
              type='button'
              onClick={handleReset}
              disabled={isSaving}
            >
              恢复默认
            </Button>
          </>
        }
      />

      {settingsError && (
        <p className={cx('settings-error')} role='alert'>
          {settingsError}
        </p>
      )}

      <section className={cx('settings-section')}>
        <div className={cx('settings-section-title')}>
          <h2>左侧菜单</h2>
          <p>按需显示功能入口；关闭后仅隐藏菜单，不影响已有数据，偏好设置始终保留。</p>
        </div>
        <div className={cx('settings-toggles')}>
          {CONFIGURABLE_MENU_ENTRIES.map((entry) => {
            const parentVisible = resolveMenuVisibility(
              entry.key,
              entry.defaultVisible,
              settings.navigation.menuVisibility,
            )
            return (
              <div key={entry.key} className={cx('settings-toggle-group')}>
                <ToggleRow
                  title={entry.label}
                  description={entry.description}
                  checked={parentVisible}
                  onChange={(checked) => updateMenuVisibility(entry.key, checked)}
                />
                {entry.children.map((child) => (
                  <ToggleRow
                    key={child.key}
                    title={child.label}
                    description={child.description}
                    checked={
                      parentVisible &&
                      resolveMenuVisibility(child.key, child.defaultVisible, settings.navigation.menuVisibility)
                    }
                    disabled={!parentVisible}
                    nested
                    onChange={(checked) => updateMenuVisibility(child.key, checked)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </section>

      <section className={cx('settings-section')}>
        <div className={cx('settings-section-title')}>
          <h2>主题与外观</h2>
          <p>控制应用配色、强调色、界面密度、默认按钮尺寸和文字缩放。</p>
        </div>

        <div className={cx('settings-grid')}>
          <fieldset className={cx('settings-fieldset')}>
            <legend>主题模式</legend>
            <RadioGroup
              aria-label='主题模式'
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
                { value: 'comfortable', label: '舒适' },
                { value: 'compact', label: '紧凑' },
              ]}
              onValueChange={(density) => updateAppearance('density', density)}
            />
          </label>

          <fieldset className={cx('settings-fieldset')}>
            <legend>默认按钮尺寸</legend>
            <RadioGroup
              aria-label='默认按钮尺寸'
              name='button-size'
              value={settings.appearance.buttonSize}
              options={BUTTON_SIZE_OPTIONS}
              onValueChange={(buttonSize) => updateAppearance('buttonSize', buttonSize)}
            />
          </fieldset>

          <label className={cx('settings-field')}>
            <span>文字缩放：{Math.round(settings.appearance.fontScale * 100)}%</span>
            <Slider
              aria-label='文字缩放'
              min={0.85}
              max={1.25}
              step={0.05}
              value={settings.appearance.fontScale}
              onValueChange={(fontScale) => updateAppearance('fontScale', fontScale)}
            />
          </label>
        </div>
      </section>

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

      <section className={cx('settings-section')}>
        <div className={cx('settings-section-title')}>
          <h2>应用更新</h2>
          <p>启动时会自动检查正式版本，也可以在这里手动检查最新版本。</p>
        </div>
        <div className={cx('settings-update-content')}>
          <div>
            <strong>{updateSummary}</strong>
            <small>{updateInfo?.currentVersion ? `当前版本 ${updateInfo.currentVersion}` : '正在读取当前版本'}</small>
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
                    : '下载完成，正在准备安装…'}
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
          <Button
            type='button'
            variant={updateStatus?.updateAvailable ? 'primary' : 'outline'}
            disabled={
              isUpdateLoading || isChecking || isInstalling || !updateInfo?.configured || !updateInfo.canInstall
            }
            onClick={() => void checkForUpdates(true)}
          >
            {isInstalling ? '正在安装…' : isChecking ? '正在检查…' : '检查最新版'}
          </Button>
        </div>
      </section>
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
  nested?: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ title, description, checked, disabled = false, nested = false, onChange }: ToggleRowProps) {
  return (
    <label className={cx(`settings-toggle-row${nested ? ' is-nested' : ''}${disabled ? ' is-disabled' : ''}`)}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Switch aria-label={title} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  )
}
