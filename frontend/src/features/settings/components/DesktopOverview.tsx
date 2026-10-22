import { ChevronDown, ClipboardCopy, FolderOpen, MonitorCog, Package, RefreshCw, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { BrandIcon } from '@/shared/components/brand-icon'
import { Button, Skeleton, SpinnerIcon } from '@/shared/components/ui'
import { type RuntimeStatus } from '@/shared/diagnostics'

import { fileName, formatDate, formatUptime } from '../lib/runtimeStatus'
import { settingsViewSession } from '../lib/settingsViewSession'

import { styles } from './DesktopOverview.css'

interface DesktopOverviewProps {
  status: RuntimeStatus | null
  loading: boolean
  error: string
  openingLogs: boolean
  copying: boolean
  onRefresh: () => Promise<void>
  onCopySummary: () => Promise<void>
  onOpenLogs: () => Promise<void>
}

export function DesktopOverview({
  status,
  loading,
  error,
  openingLogs,
  copying,
  onRefresh,
  onCopySummary,
  onOpenLogs,
}: DesktopOverviewProps) {
  const { info: updateInfo, status: updateStatus } = useAppUpdate()
  const [expanded, setExpanded] = useState(settingsViewSession.diagnosticsExpanded)
  const detailsId = useId()
  const currentVersion = status?.appVersion || updateInfo?.currentVersion || updateStatus?.currentVersion || '—'
  const pending = loading && !status
  const platform = status
    ? `${status.os || '—'} / ${status.arch || '—'}`
    : updateInfo
      ? `${updateInfo.platform} / ${updateInfo.arch}`
      : '—'

  function toggleDetails() {
    settingsViewSession.diagnosticsExpanded = !expanded
    setExpanded(!expanded)
  }

  return (
    <article className={styles.card} aria-busy={loading}>
      <div className={styles.summary}>
        <div className={styles.identity}>
          <BrandIcon className={styles.logo} />
          <div className={styles.identityCopy}>
            <h2 className={styles.name}>{appConfig.displayName}</h2>
            <p className={styles.author}>由 {appConfig.authorName} 构建与维护</p>
          </div>
        </div>
        <div className={styles.runtime} aria-label='应用运行状态'>
          {pending ? (
            <Skeleton className={styles.valueSkeleton} aria-hidden='true' />
          ) : status ? (
            `${status.ready ? '已就绪' : '初始化中'} · 运行 ${formatUptime(status.uptimeSeconds)}`
          ) : (
            '运行信息暂不可用'
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.meta}>
          <MetaItem pending={loading && currentVersion === '—'} icon={Package} label={`版本 ${currentVersion}`} />
          <MetaItem pending={pending && !updateInfo} icon={MonitorCog} label={platform} />
        </div>
        <div className={styles.actions}>
          <Button variant='outline' disabled={loading} onClick={() => void onRefresh()}>
            <SpinnerIcon icon={RefreshCw} spinning={loading} size={15} aria-hidden='true' />
            刷新状态
          </Button>
          <Button variant='ghost' aria-expanded={expanded} aria-controls={detailsId} onClick={toggleDetails}>
            诊断详情
            <ChevronDown size={15} className={styles.chevron} data-expanded={expanded} aria-hidden='true' />
          </Button>
        </div>
      </div>
      <div
        id={detailsId}
        data-expanded={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
        className={styles.diagnosticsPanel}
      >
        <div className={styles.diagnosticsClip}>
          <div className={styles.diagnostics}>
            <dl className={styles.details}>
              <Detail pending={pending} label='启动时间' value={status ? formatDate(status.startedAt) : '—'} />
              <Detail pending={pending} label='第二实例' value={status ? `${status.secondInstanceCount} 次` : '—'} />
              <Detail pending={pending} label='Go 版本' value={status?.goVersion || '—'} />
              <Detail pending={pending} label='日志文件' value={status ? fileName(status.logFile) : '—'} />
              <Detail pending={pending} label='检查时间' value={status ? formatDate(status.checkedAt) : '—'} />
              <Detail
                pending={loading && !updateInfo}
                label='构建类型'
                value={updateInfo ? (updateInfo.configured ? '正式发布构建' : '开发构建') : '—'}
              />
            </dl>
            <div className={styles.actions}>
              <Button variant='secondary' disabled={!status || copying} onClick={() => void onCopySummary()}>
                <SpinnerIcon icon={ClipboardCopy} spinning={copying} size={15} aria-hidden='true' />
                复制摘要
              </Button>
              <Button variant='ghost' disabled={openingLogs} onClick={() => void onOpenLogs()}>
                <SpinnerIcon icon={FolderOpen} spinning={openingLogs} size={15} aria-hidden='true' />
                打开日志
              </Button>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <p className={styles.error} role='alert'>
          {error}
          {status ? '（当前展示上次成功检查的信息）' : ''}
        </p>
      )}
    </article>
  )
}

function Detail({ label, value, pending }: { label: string; value: string; pending: boolean }) {
  return (
    <div className={styles.detail}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd
        className={styles.detailValue}
        title={pending ? undefined : value}
        aria-label={pending ? '加载中' : undefined}
      >
        {pending ? <Skeleton className={styles.valueSkeleton} aria-hidden='true' /> : value}
      </dd>
    </div>
  )
}

function MetaItem({ icon: Icon, label, pending }: { icon: LucideIcon; label: string; pending: boolean }) {
  return (
    <div className={styles.metaItem} title={pending ? undefined : label} aria-label={pending ? '加载中' : undefined}>
      <Icon size={13} className={styles.metaIcon} aria-hidden='true' />
      {pending ? (
        <Skeleton className={styles.valueSkeleton} aria-hidden='true' />
      ) : (
        <span className={styles.metaLabel}>{label}</span>
      )}
    </div>
  )
}
