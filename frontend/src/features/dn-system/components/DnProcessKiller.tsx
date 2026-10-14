import { PanelTop, RefreshCw, Skull, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'

import { LOCAL_SHORTCUT_KEYS, useSettings, type LocalShortcutKey } from '@/features/settings'
import { Button, Card, CardContent, ListState, PageHeader, SpinnerIcon, Select } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import {
  PROCESS_NAME,
  PROCESS_TEST_MODE,
  PROCESS_CONTROL_SUPPORTED,
  getProcessErrorMessage,
  openDragonNestProcessWindow,
  terminateDragonNestProcess,
  type DragonNestProcess,
} from '../api/dnProcessApi'
import { useDnProcessList } from '../hooks/useDnProcessList'
import { useDnProcessShortcut } from '../hooks/useDnProcessShortcut'
import { DnLauncherSettings } from './DnLauncherSettings'

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
  const {
    settings,
    isLoading: settingsLoading,
    isSaving: settingsSaving,
    error: settingsError,
    updateSettings,
    refreshSettings,
  } = useSettings()
  const { items, scanning, scanned, scannedAt, error, refresh: scan, onTerminated } = useDnProcessList()
  const [selectedPID, setSelectedPID] = useState<number | null>(null)
  const [terminating, setTerminating] = useState(false)

  const selected = items.find((item) => item.pid === selectedPID) ?? (items.length === 1 ? items[0] : null)

  const [openingWindow, setOpeningWindow] = useState(false)
  const handleShortcutSuccess = useCallback(
    (process: DragonNestProcess) => {
      onTerminated(process)
      setSelectedPID((current) => (current === process.pid ? null : current))
      void refreshSettings()
    },
    [onTerminated, refreshSettings],
  )
  const shortcut = useDnProcessShortcut(handleShortcutSuccess)

  async function openWindow() {
    if (openingWindow) return
    setOpeningWindow(true)
    try {
      await openDragonNestProcessWindow()
    } catch (openError) {
      notify({ title: '打开小窗失败', message: getProcessErrorMessage(openError, '请稍后重试。'), tone: 'error' })
    } finally {
      setOpeningWindow(false)
    }
  }

  async function terminateSelected() {
    if (!selected || scanning || terminating || shortcut.busy) return
    setTerminating(true)
    try {
      const terminated = await terminateDragonNestProcess(selected)
      onTerminated(terminated)
      setSelectedPID(null)
      notify({ title: `已结束 ${terminated.name}`, tone: 'success' })
      await refreshSettings()
    } catch (terminateError) {
      notify({
        title: `结束 ${PROCESS_NAME} 失败`,
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
        eyebrow={PROCESS_TEST_MODE ? 'macOS 测试' : '龙之谷'}
        title={PROCESS_TEST_MODE ? 'Firefox 进程' : '进程'}
        subtitle={
          PROCESS_TEST_MODE
            ? '扫描 Firefox 主进程，测试一键关闭、快捷键与置顶小窗。'
            : '扫描龙之谷及 DNLauncher.exe，选择后快速结束；扫描会记住启动器路径。'
        }
        actions={
          <Button variant='outline' disabled={scanning || terminating || shortcut.busy} onClick={() => void scan()}>
            <SpinnerIcon icon={RefreshCw} spinning={scanning} aria-hidden='true' />
            {scanning ? '正在扫描…' : '扫描进程'}
          </Button>
        }
      />

      <Card className={cx('dn-process-card')}>
        <CardContent>
          <div className={cx('dn-process-intro')}>
            <span>首次结束成功后会记住该进程路径，按 {shortcut.shortcutKey} 时优先结束同一路径的进程。</span>
            <span className={cx('dn-process-shortcut-hint')}>
              本页获得焦点时按 <kbd className={cx('dn-process-shortcut-key')}>{shortcut.shortcutKey}</kbd> 结束进程
            </span>
          </div>

          {scanned && !error && (
            <div className={cx('dn-process-meta')}>
              <span className={cx('dn-process-meta-text')}>
                {items.length ? `发现 ${items.length} 个候选进程` : '未发现候选进程'} · 扫描于{' '}
                {formatScannedAt(scannedAt)}
              </span>
              {settings.dragonNest.targetPath && <span title={settings.dragonNest.targetPath}>已记录目标路径</span>}
              {settings.dragonNest.launcherPath && <span title={settings.dragonNest.launcherPath}>已记录启动器</span>}
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
              emptyText={`点击“扫描进程”获取当前运行的 ${PROCESS_NAME} 进程。`}
              icon={<Skull aria-hidden='true' />}
            />
          ) : items.length ? (
            <div className={cx('dn-process-list')} role='listbox' aria-label={`${PROCESS_NAME} 候选进程`}>
              {items.map((item) => (
                <Button
                  key={`${item.pid}-${item.path}`}
                  className={cx('dn-process-row')}
                  variant='ghost'
                  aria-pressed={selected?.pid === item.pid}
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
              emptyText={`未发现 ${PROCESS_NAME} 进程。`}
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
                <Button
                  variant='danger'
                  disabled={scanning || terminating || shortcut.busy}
                  onClick={() => void terminateSelected()}
                >
                  <Skull aria-hidden='true' />
                  {terminating ? '正在结束…' : `结束 ${PROCESS_NAME}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!PROCESS_TEST_MODE && PROCESS_CONTROL_SUPPORTED && (
        <DnLauncherSettings
          scanned={scanned}
          launcherDetected={items.some((item) => item.name.toLowerCase() === 'dnlauncher.exe')}
        />
      )}

      <Card className={cx('dn-process-shortcut-card')}>
        <CardContent>
          <div className={cx('dn-process-shortcut-toolbar')}>
            <div className={cx('dn-process-shortcut-settings')}>
              <span id='process-shortcut-label'>快捷键</span>
              <Select<LocalShortcutKey>
                className={cx('dn-process-shortcut-select')}
                aria-labelledby='process-shortcut-label'
                value={settings.dragonNest.localShortcutKey}
                options={LOCAL_SHORTCUT_KEYS.map((key) => ({ value: key, label: key }))}
                disabled={settingsLoading || settingsSaving || !PROCESS_CONTROL_SUPPORTED}
                onValueChange={(localShortcutKey) => {
                  void updateSettings((current) => ({
                    ...current,
                    dragonNest: { ...current.dragonNest, localShortcutKey },
                  })).catch(() => undefined)
                }}
              />
              <span role='status'>{settingsSaving ? '保存中…' : '默认 F4 · 自动保存'}</span>
            </div>
            <Button
              variant='outline'
              disabled={openingWindow || !PROCESS_CONTROL_SUPPORTED}
              onClick={() => void openWindow()}
            >
              <PanelTop aria-hidden='true' />
              {openingWindow ? '正在打开…' : '打开置顶小窗'}
            </Button>
          </div>
          <p className={cx('dn-process-shortcut-note')}>
            聚焦后生效，部分键盘需 Fn+{shortcut.shortcutKey}。{PROCESS_TEST_MODE && '关闭 Firefox 前请保存工作。'}
          </p>
          {settingsError && (
            <p className={cx('dn-process-shortcut-note')} role='alert'>
              {settingsError}
            </p>
          )}
          {(!PROCESS_CONTROL_SUPPORTED || shortcut.status) && (
            <p className={cx('dn-process-shortcut-note')} role='status'>
              {!PROCESS_CONTROL_SUPPORTED ? '当前系统暂不支持此进程操作。' : shortcut.status}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
