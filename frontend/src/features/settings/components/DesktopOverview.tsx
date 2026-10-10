import {
  CalendarCheck,
  FlaskConical,
  GitBranch,
  LayoutGrid,
  Mails,
  MonitorCog,
  NotebookPen,
  Package,
  Rocket,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { appConfig } from '@/app/appConfig'
import { useAppUpdate } from '@/features/app-update'
import { BrandIcon } from '@/shared/components/brand-icon'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { DEVTOOLS_DESKTOP_LAB_PREFERENCE, isAppViewVisible, resolveMenuVisibility } from '@/shared/navigation'

import { useSettings } from '../context/SettingsProvider'

import { styles } from './DesktopOverview.css'

const cx = createScopedClassNames(styles)

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
      label: '笔记',
      description: '云端笔记',
      icon: NotebookPen,
      enabled: isAppViewVisible('quick-notes', settings.navigation.menuVisibility),
    },
    {
      label: '消息',
      description: '消息收件箱',
      icon: Mails,
      enabled: isAppViewVisible('site-messages', settings.navigation.menuVisibility),
    },
    {
      label: '龙之谷',
      description: '周计划与角色',
      icon: CalendarCheck,
      enabled: isAppViewVisible('dn-weekly', settings.navigation.menuVisibility),
    },
    {
      label: '实验室',
      description: '文本与桌面工具',
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
          {embedded ? <h2 className={cx('overview-title')}>概览</h2> : <h1 className={cx('overview-title')}>概览</h1>}
          <span className={cx('overview-description')}>快速了解当前构建与功能启用情况。</span>
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
