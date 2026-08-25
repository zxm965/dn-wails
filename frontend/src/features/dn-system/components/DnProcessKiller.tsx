import { RefreshCw, Skull, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'

import { DRAGON_NEST_SHORTCUT_OPTIONS, useSettings, type AppSettings } from '@/features/settings'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  ListState,
  PageHeader,
  Select,
  SpinnerIcon,
  Switch,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { isWindows } from '@/shared/lib/platform'

import {
  getProcessErrorMessage,
  listDragonNestProcesses,
  terminateDragonNestProcess,
  type DragonNestProcess,
} from '../api/dnProcessApi'

import { styles } from './DnProcessKiller.css'

const cx = createScopedClassNames(styles)

function formatScannedAt(value: Date | null): string {
  if (!value) return '尚未扫描'
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
}

export function DnProcessKiller() {
  const { notify } = useFeedback()
  const { settings, isSaving: isSettingsSaving, error: settingsError, updateSettings } = useSettings()
  const [items, setItems] = useState<DragonNestProcess[]>([])
  const [selectedPID, setSelectedPID] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [terminating, setTerminating] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [scannedAt, setScannedAt] = useState<Date | null>(null)

  const selected = items.find((item) => item.pid === selectedPID) ?? null

  function updateDragonNest<Key extends keyof AppSettings['dragonNest']>(
    key: Key,
    value: AppSettings['dragonNest'][Key],
  ) {
    void updateSettings((current) => ({
      ...current,
      dragonNest: { ...current.dragonNest, [key]: value },
    })).catch(() => undefined)
  }

  const scan = useCallback(async () => {
    setScanning(true)
    setError('')
    try {
      const next = await listDragonNestProcesses()
      setItems(next)
      setSelectedPID(next.length === 1 ? next[0].pid : null)
      setScanned(true)
      setScannedAt(new Date())
    } catch (scanError) {
      setItems([])
      setSelectedPID(null)
      setScanned(true)
      setError(getProcessErrorMessage(scanError, '当前系统暂不支持结束 DN 进程。'))
    } finally {
      setScanning(false)
    }
  }, [])

  async function terminateSelected() {
    if (!selected || terminating) return
    setTerminating(true)
    try {
      const terminated = await terminateDragonNestProcess(selected)
      setItems((current) => current.filter((item) => item.pid !== terminated.pid))
      setSelectedPID(null)
      notify({ title: `已结束 ${terminated.name}`, tone: 'success' })
      if (settings.dragonNest.targetPath !== terminated.path) {
        void updateSettings((current) => ({
          ...current,
          dragonNest: { ...current.dragonNest, targetPath: terminated.path },
        })).catch(() => undefined)
      }
    } catch (terminateError) {
      notify({
        title: '结束 DN 失败',
        message: getProcessErrorMessage(terminateError, '请重新扫描后重试。'),
        tone: 'error',
      })
    } finally {
      setTerminating(false)
    }
  }

  return (
    <div className={cx('dn-process-page')}>
      <PageHeader
        eyebrow='DNTools'
        title='进程'
        subtitle='扫描当前运行的龙之谷进程，选择后快速结束。'
        actions={
          <Button variant='outline' disabled={scanning || terminating} onClick={() => void scan()}>
            <SpinnerIcon icon={RefreshCw} spinning={scanning} aria-hidden='true' />
            {scanning ? '正在扫描…' : '扫描进程'}
          </Button>
        }
      />

      <Card className={cx('dn-process-card')}>
        <CardContent>
          <div className={cx('dn-process-intro')}>
            <span>首次结束成功后会记住该进程路径，启用快捷键时优先结束同一路径的进程。</span>
            {settings.dragonNest.shortcutEnabled && (
              <span className={cx('dn-process-shortcut-hint')}>
                快捷键已启用 <kbd className={cx('dn-process-shortcut-key')}>{settings.dragonNest.shortcutKey}</kbd>
              </span>
            )}
          </div>

          {scanned && !error && (
            <div className={cx('dn-process-meta')}>
              <span className={cx('dn-process-meta-text')}>
                {items.length ? `发现 ${items.length} 个候选进程` : '未发现候选进程'} · 扫描于{' '}
                {formatScannedAt(scannedAt)}
              </span>
              {settings.dragonNest.targetPath && <span title={settings.dragonNest.targetPath}>已记录目标路径</span>}
            </div>
          )}

          {error ? (
            <ListState
              className={cx('dn-process-empty')}
              loading={false}
              emptyText={error}
              icon={<TriangleAlert aria-hidden='true' />}
            />
          ) : !scanned ? (
            <ListState
              className={cx('dn-process-empty')}
              loading={false}
              emptyText='点击“扫描进程”获取当前运行的龙之谷进程。'
              icon={<Skull aria-hidden='true' />}
            />
          ) : items.length ? (
            <div className={cx('dn-process-list')} role='listbox' aria-label='龙之谷候选进程'>
              {items.map((item) => (
                <Button
                  key={`${item.pid}-${item.path}`}
                  className={cx('dn-process-row')}
                  variant='ghost'
                  aria-pressed={selectedPID === item.pid}
                  onClick={() => setSelectedPID(item.pid)}
                >
                  <span className={cx('dn-process-row-main')}>
                    <strong className={cx('dn-process-row-title')}>{item.name}</strong>
                    <span className={cx('dn-process-row-path')} title={item.path}>
                      {item.path}
                    </span>
                  </span>
                  <span className={cx('dn-process-row-meta')}>PID {item.pid}</span>
                </Button>
              ))}
            </div>
          ) : (
            <ListState
              className={cx('dn-process-empty')}
              loading={false}
              emptyText='未发现龙之谷进程。'
              icon={<Skull aria-hidden='true' />}
            />
          )}

          {selected && (
            <div className={cx('dn-process-selected-target')}>
              <div className={cx('dn-process-selected-target-copy')}>
                <strong className={cx('dn-process-selected-target-title')}>已选择：{selected.name}</strong>
                <span className={cx('dn-process-selected-target-path')} title={selected.path}>
                  {selected.path}
                </span>
              </div>
              <div className={cx('dn-process-actions')}>
                <Button variant='danger' disabled={terminating} onClick={() => void terminateSelected()}>
                  <Skull aria-hidden='true' />
                  {terminating ? '正在结束…' : '秒掉进程'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cx('dn-process-settings-card')}>
        <CardHeader className={cx('dn-process-settings-header')}>
          <div>
            <CardDescription>
              可选的全局快捷键，仅 Windows 支持。默认快捷键为 F4，关闭后不会占用系统快捷键。
            </CardDescription>
          </div>
          <span className={cx('dn-process-settings-status')} aria-live='polite'>
            {isSettingsSaving ? '正在同步…' : '修改后自动保存'}
          </span>
        </CardHeader>
        <CardContent>
          {settingsError && (
            <p className={cx('dn-process-settings-error')} role='alert'>
              {settingsError}
            </p>
          )}
          <div className={cx('dn-process-settings-grid')}>
            <label className={cx('dn-process-settings-field')}>
              <span className={cx('dn-process-settings-field-label')}>快捷键</span>
              <Select
                aria-label='DN 结束进程快捷键'
                value={settings.dragonNest.shortcutKey}
                disabled={!isWindows() || !settings.dragonNest.shortcutEnabled}
                options={DRAGON_NEST_SHORTCUT_OPTIONS.map((key) => ({ value: key, label: key }))}
                onValueChange={(shortcutKey) => updateDragonNest('shortcutKey', shortcutKey)}
              />
            </label>
            <div className={cx('dn-process-settings-field', 'dn-process-settings-inline-note')}>
              <span className={cx('dn-process-settings-field-label')}>快捷目标</span>
              <small className={cx('dn-process-settings-note-copy')}>
                {settings.dragonNest.targetPath
                  ? `已记录：${settings.dragonNest.targetPath.split(/[\\/]/).pop() ?? settings.dragonNest.targetPath}`
                  : '尚未记录，成功结束一次进程后自动记录'}
              </small>
            </div>
          </div>
          <label className={cx('dn-process-settings-toggle')}>
            <span className={cx('dn-process-settings-toggle-copy')}>
              <strong className={cx('dn-process-settings-toggle-title')}>启用全局快捷键</strong>
              <small className={cx('dn-process-settings-toggle-description')}>
                {isWindows()
                  ? `在应用后台按 ${settings.dragonNest.shortcutKey} 快速结束已记录的 DN 进程。`
                  : '当前系统不是 Windows，暂不支持全局结束进程快捷键。'}
              </small>
            </span>
            <Switch
              aria-label='启用全局快捷键'
              checked={settings.dragonNest.shortcutEnabled}
              disabled={!isWindows()}
              onCheckedChange={(checked) => updateDragonNest('shortcutEnabled', checked)}
            />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
