import { useEffect, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { useSettings } from '@/features/settings'
import { useAppLifecycle } from '@/shared/app-lifecycle'
import { getDiagnosticsInfo, type DiagnosticsInfo } from '@/shared/diagnostics'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './DesktopOverview.css'

const cx = createScopedClassNames(styles)

const THEME_LABELS = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
} as const

export function DesktopOverview({ embedded = false }: { embedded?: boolean }) {
  const { settings } = useSettings()
  const { info: updateInfo } = useAppUpdate()
  const { status: lifecycleStatus, error: lifecycleError } = useAppLifecycle()
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null)
  const lifecycleReady = lifecycleStatus?.ready === true
  const lifecycleLabel = lifecycleReady
    ? '应用运行正常'
    : lifecycleError
      ? '状态读取失败'
      : lifecycleStatus
        ? '应用正在初始化'
        : '正在读取状态'
  const currentVersion = updateInfo?.currentVersion ?? diagnostics?.appVersion ?? '—'
  useEffect(() => {
    void getDiagnosticsInfo()
      .then(setDiagnostics)
      .catch(() => setDiagnostics(null))
  }, [])

  return (
    <section className={cx('desktop-overview', embedded && 'is-embedded')}>
      <header className={cx('desktop-overview-heading')}>
        <div>
          <p>Overview</p>
          {embedded ? <h2>应用概览</h2> : <h1>应用概览</h1>}
          <span>当前桌面应用的版本、平台与个性化设置。</span>
        </div>
        <div className={cx('desktop-overview-ready')} aria-live='polite' title={lifecycleError || undefined}>
          <span className={cx(lifecycleReady ? 'is-ready' : lifecycleError ? 'is-error' : '')} aria-hidden='true' />
          {lifecycleLabel}
        </div>
      </header>

      <div className={cx('desktop-overview-summary')}>
        <SummaryCard label='应用版本' value={currentVersion} hint={appConfig.displayName} />
        <SummaryCard
          label='运行平台'
          value={diagnostics ? `${diagnostics.os} / ${diagnostics.arch}` : '—'}
          hint={diagnostics?.goVersion ?? '正在读取'}
        />
        <SummaryCard
          label='当前主题'
          value={THEME_LABELS[settings.appearance.themeMode]}
          hint={`${settings.appearance.accent} · ${Math.round(settings.appearance.fontScale * 100)}%`}
        />
        <SummaryCard
          label='系统通知'
          value={!settings.notifications.enabled ? '已关闭' : settings.notifications.doNotDisturb ? '免打扰' : '已启用'}
          hint={settings.notifications.showPreview ? '显示消息预览' : '隐藏消息预览'}
        />
      </div>
    </section>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  hint: string
}

function SummaryCard({ label, value, hint }: SummaryCardProps) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}
