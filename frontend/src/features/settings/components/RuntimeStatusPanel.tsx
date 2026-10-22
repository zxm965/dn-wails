import {
  BellRing,
  CircleAlert,
  CircleCheckBig,
  CircleOff,
  CircleX,
  Palette,
  Settings2,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Badge, Button, type BadgeTone } from '@/shared/components/ui'
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
import { getAppViewPath, isAppViewVisible } from '@/shared/navigation'
import { FONT_SIZE_PRESETS } from '@/shared/theme/typography'

import { useSettings } from '../context/SettingsProvider'
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

const THEME_LABELS = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
} as const

const ACCENT_LABELS = {
  green: '绿色',
  blue: '蓝色',
  purple: '紫色',
  orange: '橙色',
} as const

const DENSITY_LABELS = {
  comfortable: '舒适',
  compact: '紧凑',
} as const

const BUTTON_SIZE_LABELS = {
  sm: '小型按钮',
  md: '标准按钮',
  lg: '大型按钮',
} as const

const CLOSE_BEHAVIOR_LABELS = {
  quit: '关闭时退出',
  hide: '隐藏到后台',
} as const

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
  attention: number
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

const ATTENTION_PRIORITY: Record<RuntimeServiceState, number> = {
  error: 0,
  warning: 1,
  ready: 2,
  unavailable: 2,
}

export function RuntimeStatusPanel({ onOpenSettings }: RuntimeStatusPanelProps) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { notify } = useFeedback()
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openingLogs, setOpeningLogs] = useState(false)
  const [copying, setCopying] = useState(false)

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

  function getServiceAction(service: RuntimeServiceStatus): CardAction | undefined {
    switch (service.key) {
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
  const capabilityItems: CapabilityItem[] = visibleServices.map((service) => ({
    key: service.key,
    priority: SERVICE_PRIORITY[service.key] ?? 85,
    attention: ATTENTION_PRIORITY[service.status],
    content: <ServiceCard service={service} action={getServiceAction(service)} />,
  }))

  capabilityItems.push(
    {
      key: 'appearance',
      priority: 0,
      attention: 2,
      content: (
        <ConfigurationCard
          icon={Palette}
          label='外观方案'
          value={`${THEME_LABELS[settings.appearance.themeMode]} · ${ACCENT_LABELS[settings.appearance.accent]}`}
          details={[
            `${DENSITY_LABELS[settings.appearance.density]}密度`,
            `${FONT_SIZE_PRESETS[settings.appearance.fontSizePreset].label}字号`,
            BUTTON_SIZE_LABELS[settings.appearance.buttonSize],
          ]}
          onConfigure={() => onOpenSettings('appearance')}
        />
      ),
    },
    {
      key: 'window',
      priority: 40,
      attention: 2,
      content: (
        <ConfigurationCard
          icon={Settings2}
          label='窗口策略'
          value={CLOSE_BEHAVIOR_LABELS[settings.window.closeBehavior]}
          details={[
            settings.window.alwaysOnTop ? '窗口始终置顶' : '普通窗口层级',
            settings.window.rememberBounds ? '记住窗口位置和大小' : '每次使用默认窗口状态',
          ]}
          onConfigure={() => onOpenSettings('window')}
        />
      ),
    },
    {
      key: 'notification-policy',
      priority: 31,
      attention: 2,
      content: (
        <ConfigurationCard
          icon={BellRing}
          label='通知策略'
          value={
            !settings.notifications.enabled
              ? '业务通知已关闭'
              : settings.notifications.doNotDisturb
                ? '免打扰已开启'
                : '业务通知已开启'
          }
          details={[
            settings.notifications.showPreview ? '显示消息正文预览' : '隐藏消息正文预览',
            settings.notifications.enabled ? '通知偏好已生效' : '所有业务通知暂停',
          ]}
          onConfigure={() => onOpenSettings('notifications')}
        />
      ),
    },
  )
  capabilityItems.sort((left, right) => left.attention - right.attention || left.priority - right.priority)

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
              <p>Service matrix</p>
              <h3>能力状态</h3>
            </div>
            <span>{status ? `${visibleServices.length} 项检查 · ` : ''}3 项配置</span>
          </header>
          <div className={cx('runtime-service-grid')}>
            {capabilityItems.map((item) => (
              <Fragment key={item.key}>{item.content}</Fragment>
            ))}
          </div>
        </section>
      </section>
    </>
  )
}

function ServiceCard({ service, action }: { service: RuntimeServiceStatus; action?: CardAction }) {
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
      <CapabilityStatus tone={meta.tone} label={meta.label} action={action} />
    </article>
  )
}

interface ConfigurationCardProps {
  icon: LucideIcon
  label: string
  value: string
  details: readonly string[]
  onConfigure: () => void
}

function ConfigurationCard({ icon: Icon, label, value, details, onConfigure }: ConfigurationCardProps) {
  return (
    <article className={cx('runtime-service-card')}>
      <span className={cx('runtime-service-icon')} aria-hidden='true'>
        <Icon />
      </span>
      <div>
        <strong>{label}</strong>
        <p className={styles['runtime-configuration-description']}>{value}</p>
        <p className={styles['runtime-configuration-description']}>{details.join(' · ')}</p>
      </div>
      <CapabilityStatus tone='outline' label='配置' action={{ label: `${label}设置`, onClick: onConfigure }} />
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
