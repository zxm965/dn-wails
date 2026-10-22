import {
  ClipboardCopy,
  Cpu,
  FolderOpen,
  GitBranch,
  MonitorCog,
  Package,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { BrandIcon } from '@/shared/components/brand-icon'
import { Button, SpinnerIcon } from '@/shared/components/ui'
import { type RuntimeStatus } from '@/shared/diagnostics'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { fileName, formatDate, formatUptime } from '../lib/runtimeStatus'

import { styles } from './DesktopOverview.css'

const cx = createScopedClassNames(styles)

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
  const currentVersion = status?.appVersion || updateInfo?.currentVersion || updateStatus?.currentVersion || '—'
  const platform = status
    ? `${status.os || '—'} / ${status.arch || '—'}`
    : updateInfo
      ? `${updateInfo.platform} / ${updateInfo.arch}`
      : '构建目标待读取'

  return (
    <section className={cx('desktop-overview')}>
      <header className={cx('overview-heading')}>
        <div>
          <p className={cx('overview-eyebrow')}>Application profile</p>
          <h2 className={cx('overview-title')}>概览</h2>
          <span className={cx('overview-description')}>应用信息、运行环境与本地诊断。</span>
        </div>
        <div className={styles.actions}>
          <Button variant='outline' disabled={loading} onClick={() => void onRefresh()}>
            <SpinnerIcon icon={RefreshCw} spinning={loading} size={15} aria-hidden='true' />
            刷新状态
          </Button>
          <Button variant='secondary' disabled={!status || copying} onClick={() => void onCopySummary()}>
            <SpinnerIcon icon={ClipboardCopy} spinning={copying} size={15} aria-hidden='true' />
            复制摘要
          </Button>
        </div>
      </header>

      <article className={cx('overview-product-card')} aria-busy={loading}>
        <div className={styles.content}>
          <div className={cx('overview-product-identity')}>
            <BrandIcon className={cx('overview-product-icon')} />
            <div>
              <span className={cx('overview-card-eyebrow')}>Desktop application</span>
              <h3 className={cx('overview-product-name')}>{appConfig.displayName}</h3>
              <p className={cx('overview-product-author')}>由 {appConfig.authorName} 构建与维护</p>
            </div>
          </div>
          {status ? (
            <dl className={styles.details}>
              <Detail
                label='运行状态'
                value={`${status.ready ? '已就绪' : '初始化中'} · 运行 ${formatUptime(status.uptimeSeconds)}`}
              />
              <Detail label='启动时间' value={formatDate(status.startedAt)} />
              <Detail label='第二实例' value={`${status.secondInstanceCount} 次`} />
              <Detail label='日志文件' value={fileName(status.logFile)} />
            </dl>
          ) : (
            <p className={styles.pending} role='status'>
              {loading ? '正在读取运行信息…' : '运行信息暂不可用，可刷新重试或打开日志查看。'}
            </p>
          )}
        </div>
        <div className={styles.footer}>
          <div className={cx('overview-build-meta')}>
            <MetaItem icon={Package} label={`版本 ${currentVersion}`} />
            <MetaItem
              icon={GitBranch}
              label={updateInfo ? (updateInfo.configured ? '正式发布构建' : '开发构建') : '构建类型待读取'}
            />
            <MetaItem icon={MonitorCog} label={platform} />
            {status?.goVersion && <MetaItem icon={Cpu} label={status.goVersion} />}
          </div>
          <div className={styles.logActions}>
            {status && (
              <span className={styles.checkedAt}>
                {loading ? '正在刷新…' : `检查于 ${formatDate(status.checkedAt)}`}
              </span>
            )}
            <Button variant='ghost' disabled={openingLogs} onClick={() => void onOpenLogs()}>
              <SpinnerIcon icon={FolderOpen} spinning={openingLogs} size={15} aria-hidden='true' />
              打开日志
            </Button>
          </div>
        </div>
        {error && (
          <p className={styles.error} role='alert'>
            {error}
            {status ? '（当前展示上次成功检查的信息）' : ''}
          </p>
        )}
      </article>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detail}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{value}</dd>
    </div>
  )
}

function MetaItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className={cx('overview-meta-item')}>
      <Icon aria-hidden='true' />
      {label}
    </span>
  )
}
