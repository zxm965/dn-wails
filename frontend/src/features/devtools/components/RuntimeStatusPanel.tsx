import {
  Activity,
  CircleAlert,
  CircleCheckBig,
  CircleOff,
  CircleX,
  ClipboardCopy,
  Clock3,
  Cpu,
  FileText,
  FolderOpen,
  RefreshCw,
  ServerCog,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Badge, Button, SpinnerIcon, type BadgeTone } from '@/shared/components/ui'
import {
  getRuntimeStatus,
  openDiagnosticsDirectory,
  type RuntimeServiceState,
  type RuntimeServiceStatus,
  type RuntimeStatus,
} from '@/shared/diagnostics'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { writeClipboard } from '@/shared/native-kit'

import { styles } from './RuntimeStatusPanel.css'

const cx = createScopedClassNames(styles)

const SERVICE_META: Record<RuntimeServiceState, { label: string; tone: BadgeTone; icon: typeof CircleCheckBig }> = {
  ready: { label: '正常', tone: 'success', icon: CircleCheckBig },
  warning: { label: '受限', tone: 'warning', icon: CircleAlert },
  unavailable: { label: '未启用', tone: 'outline', icon: CircleOff },
  error: { label: '异常', tone: 'danger', icon: CircleX },
}

function formatDate(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? '—'
}

function createSummary(status: RuntimeStatus): string {
  const services = status.services
    .map((service) => `${service.label}：${SERVICE_META[service.status].label}（${service.detail}）`)
    .join('\n')
  return [
    `应用版本：${status.appVersion || '—'}`,
    `运行环境：${status.os || '—'} / ${status.arch || '—'} / ${status.goVersion || '—'}`,
    `运行时长：${formatUptime(status.uptimeSeconds)}`,
    `检查时间：${formatDate(status.checkedAt)}`,
    '',
    services,
  ].join('\n')
}

export function RuntimeStatusPanel() {
  const { notify } = useFeedback()
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStatus(await getRuntimeStatus())
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : '运行状态读取失败。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function copySummary() {
    if (!status) return
    try {
      await writeClipboard(createSummary(status))
      notify({ title: '诊断摘要已复制', tone: 'success' })
    } catch (copyError: unknown) {
      notify({
        title: '复制诊断摘要失败',
        message: copyError instanceof Error ? copyError.message : '请稍后重试。',
        tone: 'error',
      })
    }
  }

  async function openLogs() {
    try {
      await openDiagnosticsDirectory()
    } catch (openError: unknown) {
      notify({
        title: '打开日志目录失败',
        message: openError instanceof Error ? openError.message : '请稍后重试。',
        tone: 'error',
      })
    }
  }

  return (
    <section className={cx('runtime-status-panel')}>
      <header className={cx('runtime-status-heading')}>
        <div>
          <p>Runtime health</p>
          <h2>运行状态</h2>
          <span>检查应用生命周期、服务连接、系统能力与本地诊断。</span>
        </div>
        <div className={cx('runtime-status-actions')}>
          <Button variant='outline' disabled={loading} onClick={() => void load()}>
            <SpinnerIcon icon={RefreshCw} spinning={loading} aria-hidden='true' />
            刷新状态
          </Button>
          <Button variant='secondary' disabled={!status} onClick={() => void copySummary()}>
            <ClipboardCopy aria-hidden='true' />
            复制摘要
          </Button>
        </div>
      </header>

      {error && (
        <p className={cx('runtime-status-error')} role='alert'>
          {error}
        </p>
      )}

      {!status ? (
        <div className={cx('runtime-status-empty')}>
          <Activity aria-hidden='true' />
          <strong>{loading ? '正在检查运行状态…' : '暂时无法读取运行状态'}</strong>
          <span>{loading ? '数据库与系统能力检查会并发完成。' : '请刷新重试或打开本地日志查看。'}</span>
        </div>
      ) : (
        <>
          <section className={cx(`runtime-status-hero ${status.overall === 'healthy' ? 'is-healthy' : 'is-degraded'}`)}>
            <span className={cx('runtime-status-hero-icon')} aria-hidden='true'>
              {status.overall === 'healthy' ? <CircleCheckBig /> : <CircleAlert />}
            </span>
            <div>
              <p>Overall health</p>
              <h3>{status.overall === 'healthy' ? '应用运行正常' : '部分服务受限'}</h3>
              <span>
                {status.overall === 'healthy'
                  ? '生命周期和已配置服务均已通过检查。'
                  : '应用仍可使用，但部分业务或平台能力当前不可用。'}
              </span>
            </div>
            <Badge tone={status.overall === 'healthy' ? 'success' : 'warning'}>
              {status.overall === 'healthy' ? 'Healthy' : 'Degraded'}
            </Badge>
          </section>

          <div className={cx('runtime-status-summary')}>
            <SummaryCard
              icon={Clock3}
              label='进程生命周期'
              value={status.ready ? '已就绪' : '初始化中'}
              details={[
                `运行 ${formatUptime(status.uptimeSeconds)}`,
                `启动于 ${formatDate(status.startedAt)}`,
                `第二实例 ${status.secondInstanceCount} 次`,
              ]}
            />
            <SummaryCard
              icon={Cpu}
              label='运行环境'
              value={`${status.os || '—'} / ${status.arch || '—'}`}
              details={[status.goVersion || '—', `应用版本 ${status.appVersion || '—'}`]}
            />
            <SummaryCard
              icon={FileText}
              label='本地诊断'
              value={fileName(status.logFile)}
              details={[`检查于 ${formatDate(status.checkedAt)}`]}
              action={
                <Button size='sm' variant='ghost' onClick={() => void openLogs()}>
                  <FolderOpen aria-hidden='true' />
                  打开日志
                </Button>
              }
            />
          </div>

          <section className={cx('runtime-service-section')}>
            <header>
              <div>
                <p>Service matrix</p>
                <h3>服务与平台能力</h3>
              </div>
              <span>{status.services.length} 项检查</span>
            </header>
            <div className={cx('runtime-service-grid')}>
              {status.services.map((service) => (
                <ServiceCard key={service.key} service={service} />
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  details,
  action,
}: {
  icon: typeof ServerCog
  label: string
  value: string
  details: string[]
  action?: React.ReactNode
}) {
  return (
    <article className={cx('runtime-summary-card')}>
      <span className={cx('runtime-summary-icon')} aria-hidden='true'>
        <Icon />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {details.map((detail) => (
          <small key={detail}>{detail}</small>
        ))}
      </div>
      {action}
    </article>
  )
}

function ServiceCard({ service }: { service: RuntimeServiceStatus }) {
  const meta = SERVICE_META[service.status]
  const Icon = meta.icon
  return (
    <article className={cx(`runtime-service-card is-${service.status}`)}>
      <span className={cx('runtime-service-icon')} aria-hidden='true'>
        <Icon />
      </span>
      <div>
        <strong>{service.label}</strong>
        <p>{service.detail}</p>
      </div>
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </article>
  )
}
