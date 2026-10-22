import { CircleAlert, CircleCheckBig, CircleOff, CircleHelp, CircleX } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Badge, Button, Skeleton, type BadgeTone } from '@/shared/components/ui'
import {
  openDiagnosticsDirectory,
  type RuntimeServiceState,
  type RuntimeServiceStatus,
  type RuntimeStatus,
} from '@/shared/diagnostics'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { writeClipboard } from '@/shared/native-kit'
import { getAppViewPath, isAppViewVisible } from '@/shared/navigation'

import { useSettings } from '../context/SettingsProvider'
import { useRuntimeStatus } from '../hooks/useRuntimeStatus'
import { formatDate, formatUptime } from '../lib/runtimeStatus'
import { DesktopOverview } from './DesktopOverview'

import { styles } from './RuntimeStatusPanel.css'

const cx = createScopedClassNames(styles)

const SERVICE_META: Record<RuntimeServiceState, { label: string; tone: BadgeTone; icon: typeof CircleCheckBig }> = {
  ready: { label: '正常', tone: 'success', icon: CircleCheckBig },
  warning: { label: '受限', tone: 'warning', icon: CircleAlert },
  unavailable: { label: '未启用', tone: 'outline', icon: CircleOff },
  error: { label: '异常', tone: 'danger', icon: CircleX },
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

export type SettingsPreferenceCategory = 'appearance' | 'menus' | 'notifications' | 'window'

interface RuntimeStatusPanelProps {
  onOpenSettings: (category: SettingsPreferenceCategory) => void
}

interface CardAction {
  label: string
  onClick: () => void
}

interface CapabilityItem {
  key: string
  priority: number
  content: ReactNode
}

const SERVICE_PRIORITY: Readonly<Record<string, number>> = {
  account: 10,
  notifications: 30,
  tasks: 60,
  'quick-notes': 70,
  'dn-system': 80,
  diagnostics: 90,
}

const SERVICE_SLOTS = [
  { key: 'account', label: '账号服务' },
  { key: 'notifications', label: '系统通知' },
  { key: 'tasks', label: '任务清单' },
  { key: 'quick-notes', label: '快速笔记' },
  { key: 'dn-system', label: '龙之谷' },
  { key: 'diagnostics', label: '日志诊断' },
] as const

export function RuntimeStatusPanel({ onOpenSettings }: RuntimeStatusPanelProps) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { notify } = useFeedback()
  const { status, loading, error, refresh: load } = useRuntimeStatus()
  const [openingLogs, setOpeningLogs] = useState(false)
  const [copying, setCopying] = useState(false)

  async function copySummary() {
    if (!status || copying) return
    setCopying(true)
    try {
      await writeClipboard(createSummary(status))
      notify({ title: '诊断摘要已复制', tone: 'success' })
    } catch (copyError: unknown) {
      notify({
        title: '复制诊断摘要失败',
        message: copyError instanceof Error ? copyError.message : '请稍后重试。',
        tone: 'error',
      })
    } finally {
      setCopying(false)
    }
  }

  async function openLogs() {
    if (openingLogs) return
    setOpeningLogs(true)
    try {
      await openDiagnosticsDirectory()
    } catch (openError: unknown) {
      notify({
        title: '打开日志目录失败',
        message: openError instanceof Error ? openError.message : '请稍后重试。',
        tone: 'error',
      })
    } finally {
      setOpeningLogs(false)
    }
  }

  function getServiceAction(key: string): CardAction | undefined {
    switch (key) {
      case 'account':
        return { label: '管理账号', onClick: () => navigate(getAppViewPath('account')) }
      case 'notifications':
        return { label: '通知设置', onClick: () => onOpenSettings('notifications') }
      case 'dn-system':
        return isAppViewVisible('dn-kill-process', settings.navigation.menuVisibility)
          ? { label: '快捷键设置', onClick: () => navigate(getAppViewPath('dn-kill-process')) }
          : { label: '菜单设置', onClick: () => onOpenSettings('menus') }
      default:
        return undefined
    }
  }

  const visibleServices = status?.services.filter((service) => service.key !== 'updates') ?? []
  const serviceSlots = [
    ...SERVICE_SLOTS,
    ...visibleServices.filter((service) => !SERVICE_SLOTS.some((slot) => slot.key === service.key)),
  ]
  const capabilityItems: CapabilityItem[] = serviceSlots.map((slot) => ({
    key: slot.key,
    priority: SERVICE_PRIORITY[slot.key] ?? 85,
    content: (
      <ServiceCard
        service={visibleServices.find((service) => service.key === slot.key)}
        label={slot.label}
        loading={loading}
        action={getServiceAction(slot.key)}
      />
    ),
  }))

  capabilityItems.sort((left, right) => left.priority - right.priority)

  return (
    <>
      <DesktopOverview
        status={status}
        loading={loading}
        error={error}
        openingLogs={openingLogs}
        copying={copying}
        onRefresh={load}
        onCopySummary={copySummary}
        onOpenLogs={openLogs}
      />
      <section className={cx('runtime-status-panel')}>
        <section className={cx('runtime-service-section')}>
          <header>
            <div>
              <h3>服务状态</h3>
            </div>
            <span>{serviceSlots.length} 项检查</span>
          </header>
          <div className={cx('runtime-service-grid')} aria-busy={loading}>
            {capabilityItems.map((item) => (
              <Fragment key={item.key}>{item.content}</Fragment>
            ))}
          </div>
        </section>
      </section>
    </>
  )
}

function ServiceCard({
  service,
  label,
  loading,
  action,
}: {
  service?: RuntimeServiceStatus
  label: string
  loading: boolean
  action?: CardAction
}) {
  const meta = service
    ? SERVICE_META[service.status]
    : { icon: CircleHelp, tone: 'outline' as const, label: loading ? '待获取' : '未获取' }
  const Icon = meta.icon
  return (
    <article className={cx('runtime-service-card', service ? `is-${service.status}` : undefined)}>
      <span className={cx('runtime-service-icon')} aria-hidden='true'>
        <Icon />
      </span>
      <div>
        <strong>{service?.label ?? label}</strong>
        {!service && loading ? (
          <div className={styles.pendingDescription} aria-label='加载中'>
            <Skeleton className={styles.descriptionSkeleton} aria-hidden='true' />
          </div>
        ) : (
          <p title={service?.detail}>{service?.detail || '暂不可用，请刷新重试'}</p>
        )}
      </div>
      <CapabilityStatus tone={meta.tone} label={meta.label} action={action} />
    </article>
  )
}

interface CapabilityStatusProps {
  tone: BadgeTone
  label: string
  action?: CardAction
}

function CapabilityStatus({ tone, label, action }: CapabilityStatusProps) {
  const badge = <Badge tone={tone}>{label}</Badge>
  if (!action) return badge

  return (
    <Button
      className={styles['runtime-status-link']}
      size='sm'
      variant='ghost'
      ripple={false}
      title={action.label}
      aria-label={`${label}，${action.label}`}
      onClick={action.onClick}
    >
      {badge}
    </Button>
  )
}
