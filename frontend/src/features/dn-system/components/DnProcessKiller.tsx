import { RefreshCw, Skull, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'

import { useSettings } from '@/features/settings'
import { Button, Card, CardContent, ListState, PageHeader, SpinnerIcon } from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

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
  const { settings, updateSettings } = useSettings()
  const [items, setItems] = useState<DragonNestProcess[]>([])
  const [selectedPID, setSelectedPID] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [terminating, setTerminating] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [scannedAt, setScannedAt] = useState<Date | null>(null)

  const selected = items.find((item) => item.pid === selectedPID) ?? null

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
        eyebrow='DN惊鸿'
        title='Kill'
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
            <strong className={cx('dn-process-intro-strong')}>只显示疑似龙之谷进程</strong>
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
    </div>
  )
}
