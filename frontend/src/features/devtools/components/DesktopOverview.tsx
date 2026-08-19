import {
  BellRing,
  CalendarCheck,
  FlaskConical,
  GitBranch,
  LayoutGrid,
  Mails,
  MonitorCog,
  NotebookPen,
  Package,
  Palette,
  Rocket,
  Settings2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { useSettings } from '@/features/settings'
import { BrandIcon } from '@/shared/components/brand-icon'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { DEVTOOLS_DESKTOP_LAB_PREFERENCE, isAppViewVisible, resolveMenuVisibility } from '@/shared/navigation'

import { styles } from './DesktopOverview.css'

const cx = createScopedClassNames(styles)

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

interface FeatureSnapshot {
  label: string
  description: string
  icon: LucideIcon
  enabled: boolean
}

export function DesktopOverview({ embedded = false }: { embedded?: boolean }) {
  const { settings } = useSettings()
  const { info: updateInfo, status: updateStatus, isChecking } = useAppUpdate()
  const currentVersion = updateInfo?.currentVersion || updateStatus?.currentVersion || '—'
  const updateState = isChecking
    ? 'checking'
    : updateStatus?.updateAvailable
      ? 'available'
      : updateStatus || updateInfo?.configured
        ? 'ready'
        : 'inactive'
  const updateTitle = isChecking
    ? '正在检查更新'
    : updateStatus?.updateAvailable
      ? `发现 ${updateStatus.latestVersion}`
      : updateStatus
        ? '当前已是最新版'
        : updateInfo?.configured
          ? '正式更新通道'
          : '开发构建'
  const updateDescription = isChecking
    ? '正在连接发布源读取最新版本。'
    : updateStatus?.updateAvailable
      ? updateStatus.releaseName || '新版本已经可以获取。'
      : updateStatus
        ? `已检查最新版本 ${updateStatus.latestVersion}。`
        : updateInfo?.configured
          ? updateInfo.canInstall
            ? '支持自动检查、下载和安装正式版本。'
            : '可以检查正式版本，当前平台不支持自动安装。'
          : '当前构建未配置正式发布源。'

  const devToolsVisible = isAppViewVisible('devtools', settings.navigation.menuVisibility)
  const desktopLabVisible =
    devToolsVisible &&
    resolveMenuVisibility(
      DEVTOOLS_DESKTOP_LAB_PREFERENCE.key,
      DEVTOOLS_DESKTOP_LAB_PREFERENCE.defaultVisible,
      settings.navigation.menuVisibility,
    )
  const featureSnapshots: FeatureSnapshot[] = [
    {
      label: '快速笔记',
      description: '云端笔记',
      icon: NotebookPen,
      enabled: isAppViewVisible('quick-notes', settings.navigation.menuVisibility),
    },
    {
      label: '站内消息',
      description: '消息收件箱',
      icon: Mails,
      enabled: isAppViewVisible('site-messages', settings.navigation.menuVisibility),
    },
    {
      label: 'DN 周常',
      description: '周计划与角色',
      icon: CalendarCheck,
      enabled: isAppViewVisible('dn-weekly', settings.navigation.menuVisibility),
    },
    {
      label: 'DevTools',
      description: '开发工具',
      icon: Wrench,
      enabled: devToolsVisible,
    },
    {
      label: '桌面实验室',
      description: '原生能力验证',
      icon: FlaskConical,
      enabled: desktopLabVisible,
    },
  ]
  const enabledFeatureCount = featureSnapshots.filter((feature) => feature.enabled).length

  return (
    <section className={cx('desktop-overview', embedded && 'is-embedded')}>
      <header className={cx('overview-heading')}>
        <div>
          <p className={cx('overview-eyebrow')}>Application profile</p>
          {embedded ? (
            <h2 className={cx('overview-title')}>应用概览</h2>
          ) : (
            <h1 className={cx('overview-title')}>应用概览</h1>
          )}
          <span className={cx('overview-description')}>快速了解当前构建、应用策略与功能启用情况。</span>
        </div>
        <span className={cx('overview-tag')}>Configuration snapshot</span>
      </header>

      <div className={cx('overview-top-grid')}>
        <article className={cx('overview-product-card')}>
          <div className={cx('overview-product-identity')}>
            <BrandIcon className={cx('overview-product-icon')} />
            <div>
              <span className={cx('overview-card-eyebrow')}>Desktop application</span>
              <h3 className={cx('overview-product-name')}>{appConfig.displayName}</h3>
              <p className={cx('overview-product-author')}>由 {appConfig.authorName} 构建与维护</p>
            </div>
          </div>
          <div className={cx('overview-build-meta')}>
            <MetaItem icon={Package} label={`版本 ${currentVersion}`} />
            <MetaItem icon={GitBranch} label={updateInfo?.configured ? '正式发布构建' : '开发构建'} />
            <MetaItem
              icon={MonitorCog}
              label={updateInfo ? `${updateInfo.platform} / ${updateInfo.arch}` : '正在读取构建目标'}
            />
          </div>
        </article>

        <article className={cx('overview-update-card')} data-state={updateState}>
          <div className={cx('overview-update-heading')}>
            <span className={cx('overview-update-icon')} aria-hidden='true'>
              <Rocket />
            </span>
            <span className={cx('overview-card-eyebrow')}>Release channel</span>
          </div>
          <div>
            <h3 className={cx('overview-update-title')}>{updateTitle}</h3>
            <p className={cx('overview-update-description')}>{updateDescription}</p>
          </div>
          <div className={cx('overview-update-meta')}>
            <span>{updateInfo?.configured ? '正式更新' : '本地开发'}</span>
            <span>{updateInfo?.canInstall ? '支持自动安装' : '只读版本信息'}</span>
          </div>
        </article>
      </div>

      <div className={cx('overview-policy-grid')}>
        <PolicyCard
          icon={Palette}
          eyebrow='Appearance'
          title='外观方案'
          value={`${THEME_LABELS[settings.appearance.themeMode]} · ${ACCENT_LABELS[settings.appearance.accent]}`}
          details={[
            `${DENSITY_LABELS[settings.appearance.density]}密度`,
            `字号 ${Math.round(settings.appearance.fontScale * 100)}%`,
            BUTTON_SIZE_LABELS[settings.appearance.buttonSize],
          ]}
        />
        <PolicyCard
          icon={Settings2}
          eyebrow='Window policy'
          title='窗口策略'
          value={CLOSE_BEHAVIOR_LABELS[settings.window.closeBehavior]}
          details={[
            settings.window.alwaysOnTop ? '窗口始终置顶' : '普通窗口层级',
            settings.window.rememberBounds ? '记住窗口位置和大小' : '每次使用默认窗口状态',
          ]}
        />
        <PolicyCard
          icon={BellRing}
          eyebrow='Notification policy'
          title='通知策略'
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
        />
      </div>

      <section className={cx('overview-feature-section')}>
        <header className={cx('overview-feature-heading')}>
          <div className={cx('overview-feature-title')}>
            <span className={cx('overview-feature-heading-icon')} aria-hidden='true'>
              <LayoutGrid />
            </span>
            <div>
              <span className={cx('overview-card-eyebrow')}>Feature map</span>
              <h3>功能启用地图</h3>
            </div>
          </div>
          <span className={cx('overview-feature-count')}>
            {enabledFeatureCount} / {featureSnapshots.length} 已启用
          </span>
        </header>
        <div className={cx('overview-feature-grid')}>
          {featureSnapshots.map((feature) => (
            <FeatureCard key={feature.label} feature={feature} />
          ))}
        </div>
      </section>
    </section>
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

function PolicyCard({
  icon: Icon,
  eyebrow,
  title,
  value,
  details,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  value: string
  details: string[]
}) {
  return (
    <article className={cx('overview-policy-card')}>
      <div className={cx('overview-policy-heading')}>
        <span className={cx('overview-policy-icon')} aria-hidden='true'>
          <Icon />
        </span>
        <div>
          <span className={cx('overview-card-eyebrow')}>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <strong className={cx('overview-policy-value')}>{value}</strong>
      <div className={cx('overview-policy-details')}>
        {details.map((detail) => (
          <span key={detail}>{detail}</span>
        ))}
      </div>
    </article>
  )
}

function FeatureCard({ feature }: { feature: FeatureSnapshot }) {
  const Icon = feature.icon
  return (
    <article className={cx('overview-feature-item', !feature.enabled && 'is-disabled')}>
      <span className={cx('overview-feature-icon')} aria-hidden='true'>
        <Icon />
      </span>
      <div className={cx('overview-feature-copy')}>
        <strong>{feature.label}</strong>
        <small>{feature.description}</small>
      </div>
      <span className={cx('overview-feature-state')}>{feature.enabled ? '已启用' : '已隐藏'}</span>
    </article>
  )
}
