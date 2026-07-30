import { type FormEvent, useEffect, useState } from 'react'

import { useFeedback } from '@/shared/feedback'

import { type AccentColor, type AppSettings, type Density, type ThemeMode } from '../api/settingsApi'
import { useSettings } from '../context/SettingsProvider'

import './SettingsPanel.css'

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

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    appearance: { ...settings.appearance },
    notifications: { ...settings.notifications },
    window: {
      ...settings.window,
      bounds: settings.window.bounds ? { ...settings.window.bounds } : undefined,
    },
  }
}

export function SettingsPanel() {
  const { settings, isLoading, isSaving, error, updateSettings, resetSettings } = useSettings()
  const { notify, confirm } = useFeedback()
  const [draft, setDraft] = useState<AppSettings>(() => cloneSettings(settings))

  useEffect(() => {
    setDraft(cloneSettings(settings))
  }, [settings])

  function updateAppearance<Key extends keyof AppSettings['appearance']>(
    key: Key,
    value: AppSettings['appearance'][Key],
  ) {
    setDraft((current) => ({
      ...current,
      appearance: { ...current.appearance, [key]: value },
    }))
  }

  function updateNotifications<Key extends keyof AppSettings['notifications']>(
    key: Key,
    value: AppSettings['notifications'][Key],
  ) {
    setDraft((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }))
  }

  function updateWindow<Key extends keyof AppSettings['window']>(key: Key, value: AppSettings['window'][Key]) {
    setDraft((current) => ({
      ...current,
      window: { ...current.window, [key]: value },
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await updateSettings(draft)
      notify({ title: '设置已保存', message: '主题和桌面行为已经生效。', tone: 'success' })
    } catch {
      notify({ title: '保存失败', message: '请检查设置内容后重试。', tone: 'error' })
    }
  }

  async function handleReset() {
    const accepted = await confirm({
      title: '恢复默认设置',
      message: '主题、通知和窗口设置都会恢复默认值，是否继续？',
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
    return <div className='settings-state'>正在读取应用设置…</div>
  }

  return (
    <form className='settings-panel' onSubmit={handleSubmit}>
      <header className='settings-heading'>
        <div>
          <p>Preferences</p>
          <h1>设置与外观</h1>
          <span>设置会保存到当前用户的应用配置目录。</span>
        </div>
        <div className='settings-heading-actions'>
          <button
            className='settings-button settings-button-secondary'
            type='button'
            onClick={handleReset}
            disabled={isSaving}
          >
            恢复默认
          </button>
          <button className='settings-button settings-button-primary' type='submit' disabled={isSaving}>
            {isSaving ? '正在保存…' : '保存设置'}
          </button>
        </div>
      </header>

      {error && (
        <p className='settings-error' role='alert'>
          {error}
        </p>
      )}

      <section className='settings-section'>
        <div className='settings-section-title'>
          <h2>主题与外观</h2>
          <p>控制应用配色、强调色、界面密度和文字缩放。</p>
        </div>

        <div className='settings-grid'>
          <fieldset className='settings-fieldset'>
            <legend>主题模式</legend>
            <div className='settings-segmented'>
              {THEME_OPTIONS.map((option) => (
                <label key={option.value} className={draft.appearance.themeMode === option.value ? 'is-selected' : ''}>
                  <input
                    type='radio'
                    name='theme-mode'
                    value={option.value}
                    checked={draft.appearance.themeMode === option.value}
                    onChange={() => updateAppearance('themeMode', option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className='settings-fieldset'>
            <legend>强调色</legend>
            <div className='settings-accents'>
              {ACCENT_OPTIONS.map((option) => (
                <label key={option.value} title={option.label}>
                  <input
                    type='radio'
                    name='accent-color'
                    value={option.value}
                    checked={draft.appearance.accent === option.value}
                    onChange={() => updateAppearance('accent', option.value)}
                  />
                  <span className={`settings-accent is-${option.value}`} aria-hidden='true' />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className='settings-field'>
            <span>界面密度</span>
            <select
              value={draft.appearance.density}
              onChange={(event) => updateAppearance('density', event.target.value as Density)}
            >
              <option value='comfortable'>舒适</option>
              <option value='compact'>紧凑</option>
            </select>
          </label>

          <label className='settings-field settings-range'>
            <span>文字缩放：{Math.round(draft.appearance.fontScale * 100)}%</span>
            <input
              type='range'
              min='0.85'
              max='1.25'
              step='0.05'
              value={draft.appearance.fontScale}
              onChange={(event) => updateAppearance('fontScale', Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className='settings-section'>
        <div className='settings-section-title'>
          <h2>系统通知</h2>
          <p>控制应用是否发送通知以及是否展示消息正文。</p>
        </div>
        <div className='settings-toggles'>
          <ToggleRow
            title='启用系统通知'
            description='关闭后，业务消息不会发送到系统通知中心。'
            checked={draft.notifications.enabled}
            onChange={(checked) => updateNotifications('enabled', checked)}
          />
          <ToggleRow
            title='显示消息预览'
            description='关闭后，通知正文统一显示“消息内容已隐藏”。'
            checked={draft.notifications.showPreview}
            disabled={!draft.notifications.enabled}
            onChange={(checked) => updateNotifications('showPreview', checked)}
          />
          <ToggleRow
            title='免打扰'
            description='临时暂停所有应用消息通知。'
            checked={draft.notifications.doNotDisturb}
            disabled={!draft.notifications.enabled}
            onChange={(checked) => updateNotifications('doNotDisturb', checked)}
          />
        </div>
      </section>

      <section className='settings-section'>
        <div className='settings-section-title'>
          <h2>窗口行为</h2>
          <p>窗口位置和大小会在正常关闭时保存。</p>
        </div>
        <div className='settings-grid'>
          <label className='settings-field'>
            <span>关闭窗口时</span>
            <select
              value={draft.window.closeBehavior}
              onChange={(event) =>
                updateWindow('closeBehavior', event.target.value as AppSettings['window']['closeBehavior'])
              }
            >
              <option value='quit'>退出应用</option>
              <option value='hide'>隐藏到后台</option>
            </select>
          </label>
        </div>
        <div className='settings-toggles'>
          <ToggleRow
            title='窗口始终置顶'
            description='保存后立即应用到主窗口。'
            checked={draft.window.alwaysOnTop}
            onChange={(checked) => updateWindow('alwaysOnTop', checked)}
          />
          <ToggleRow
            title='记住窗口位置和大小'
            description='下次启动时恢复上次关闭前的窗口状态。'
            checked={draft.window.rememberBounds}
            onChange={(checked) => updateWindow('rememberBounds', checked)}
          />
        </div>
      </section>
    </form>
  )
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
    <label className={`settings-toggle-row${disabled ? ' is-disabled' : ''}`}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type='checkbox'
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className='settings-switch' aria-hidden='true' />
    </label>
  )
}
