import { useEffect, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { useSettings } from '@/features/settings'
import { useAppLifecycle } from '@/shared/app-lifecycle'
import { Button } from '@/shared/components/ui'
import { getDiagnosticsInfo, type DiagnosticsInfo } from '@/shared/diagnostics'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './DesktopOverview.css'

const cx = createScopedClassNames(styles)

const CAPABILITY_GROUPS = [
  {
    title: '桌面基础',
    description: '负责应用运行和系统窗口行为。',
    modules: ['应用生命周期', '单实例', '窗口管理', '系统通知'],
  },
  {
    title: '应用体验',
    description: '提供统一且可复用的界面交互。',
    modules: ['Overlay 子视图', '应用内反馈', '主题与外观'],
  },
  {
    title: '系统服务',
    description: '为业务模块提供稳定的底层能力。',
    modules: ['设置中心', '应用更新', '本地存储', 'Native Kit', '日志诊断'],
  },
] as const

const THEME_LABELS = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
} as const

export function DesktopOverview({ embedded = false }: { embedded?: boolean }) {
  const { settings } = useSettings()
  const {
    info: updateInfo,
    status: updateStatus,
    error: updateError,
    isLoading: isUpdateLoading,
    isChecking,
    isInstalling,
    checkForUpdates,
  } = useAppUpdate()
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
  const updateSummary = isUpdateLoading
    ? '正在读取版本信息'
    : updateStatus?.updateAvailable
      ? `发现新版本 ${updateStatus.latestVersion}`
      : updateStatus
        ? `当前已是最新版 ${updateStatus.currentVersion}`
        : updateInfo?.configured
          ? '启动时自动检查更新'
          : '开发构建未启用更新'

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
          <h1>应用概览</h1>
          <span>当前桌面应用基础能力及运行状态。</span>
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

      <section className={cx('desktop-overview-section')}>
        <div className={cx('desktop-overview-section-heading')}>
          <div>
            <h2>版本与更新</h2>
            <p>正式版本启动后会自动检查 GitHub Releases，也可以在这里主动检查。</p>
          </div>
          <span>{updateStatus?.latestVersion ? `latest ${updateStatus.latestVersion}` : 'GitHub Releases'}</span>
        </div>
        <div className={cx('desktop-overview-update-content')}>
          <div>
            <strong>{updateSummary}</strong>
            <small>
              {updateInfo?.repository
                ? `${updateInfo.repository} · ${updateInfo.platform}/${updateInfo.arch}`
                : '正在读取发布配置'}
            </small>
            {updateError && <p className={cx('desktop-overview-error')}>{updateError}</p>}
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

      <section className={cx('desktop-overview-section')}>
        <div className={cx('desktop-overview-section-heading')}>
          <div>
            <h2>应用能力</h2>
            <p>基础模块按照桌面运行、应用体验和系统服务分层组织。</p>
          </div>
          <span>12 modules</span>
        </div>

        <div className={cx('desktop-overview-capabilities')}>
          {CAPABILITY_GROUPS.map((group, groupIndex) => (
            <article key={group.title}>
              <div className={cx('desktop-overview-capability-index')}>{String(groupIndex + 1).padStart(2, '0')}</div>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <ul>
                {group.modules.map((module) => (
                  <li key={module}>
                    <span aria-hidden='true' />
                    {module}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={cx('desktop-overview-section desktop-overview-runtime')}>
        <div className={cx('desktop-overview-section-heading')}>
          <div>
            <h2>运行信息</h2>
            <p>用于确认当前进程和桌面环境，不包含功能测试入口。</p>
          </div>
        </div>
        <dl>
          <RuntimeItem
            label='启动时间'
            value={lifecycleStatus?.startedAt ? new Date(lifecycleStatus.startedAt).toLocaleString('zh-CN') : '—'}
          />
          <RuntimeItem label='第二实例唤醒' value={`${lifecycleStatus?.secondInstanceCount ?? 0} 次`} />
          <RuntimeItem label='日志目录' value={diagnostics?.logDirectory ?? '—'} />
          <RuntimeItem label='关闭行为' value={settings.window.closeBehavior === 'hide' ? '隐藏到后台' : '退出应用'} />
        </dl>
        {lifecycleError && <p className={cx('desktop-overview-error')}>{lifecycleError}</p>}
      </section>
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

interface RuntimeItemProps {
  label: string
  value: string
}

function RuntimeItem({ label, value }: RuntimeItemProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  )
}
