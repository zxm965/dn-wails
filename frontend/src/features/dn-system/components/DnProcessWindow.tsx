import { Play, RefreshCw, Skull } from 'lucide-react'

import { Button, SpinnerIcon } from '@/shared/components/ui'

import { PROCESS_CONTROL_SUPPORTED } from '../api/dnProcessApi'
import { useDnProcessActions } from '../hooks/useDnProcessActions'
import { useDnProcessList } from '../hooks/useDnProcessList'

import { styles } from './DnProcessWindow.css'

export function DnProcessWindow() {
  const processes = useDnProcessList()
  const { globalShortcut, shortcutKey, busy, launching, status, clearStatus, run, launch } = useDnProcessActions()
  const statusText = !PROCESS_CONTROL_SUPPORTED ? '当前系统暂不支持' : processes.error || status
  const actionsDisabled =
    busy || !PROCESS_CONTROL_SUPPORTED || !processes.scanned || processes.scanning || Boolean(processes.error)
  const refresh = () => {
    clearStatus()
    void processes.refresh()
  }

  return (
    <main className={styles.window}>
      <div className={styles.header}>
        <p className={styles.hint} title={`部分键盘需按 Fn + ${shortcutKey}`}>
          全局 {shortcutKey}
        </p>
        <Button
          size='sm'
          variant='ghost'
          aria-label='刷新进程'
          title='刷新进程'
          disabled={processes.scanning || busy || !PROCESS_CONTROL_SUPPORTED}
          onClick={refresh}
        >
          <SpinnerIcon icon={RefreshCw} spinning={processes.scanning} aria-hidden='true' />
        </Button>
      </div>
      <p className={styles.status} role='status' title={globalShortcut.summary}>
        {globalShortcut.summary}
      </p>
      {globalShortcut.result && (
        <p className={styles.status} role='status' title={globalShortcut.result}>
          {globalShortcut.result}
        </p>
      )}
      <div className={styles.processes} aria-label='当前进程' aria-busy={processes.scanning}>
        {processes.scanning ? (
          <p className={styles.status}>正在刷新…</p>
        ) : processes.error ? (
          <p className={styles.status}>扫描失败，请刷新</p>
        ) : processes.items.length ? (
          <ul className={styles.list}>
            {processes.items.map((process) => (
              <li key={process.pid} className={styles.process} title={process.path}>
                <span className={styles.processName}>{process.name}</span>
                <span className={styles.pid}>PID {process.pid}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.status}>{PROCESS_CONTROL_SUPPORTED ? '未运行 · 启动后刷新' : '当前系统暂不支持'}</p>
        )}
      </div>
      <div className={styles.actions}>
        <Button
          variant='secondary'
          disabled={actionsDisabled || processes.items.length > 0}
          onClick={() => void launch()}
        >
          <SpinnerIcon icon={Play} spinning={launching} aria-hidden='true' />
          {launching ? '启动中…' : '启动'}
        </Button>
        <Button variant='danger' disabled={actionsDisabled || processes.items.length === 0} onClick={() => void run()}>
          <Skull aria-hidden='true' />
          {busy && !launching ? '结束中…' : '结束'}
        </Button>
      </div>
      {statusText && (
        <p className={styles.status} role='status' title={statusText}>
          {statusText}
        </p>
      )}
    </main>
  )
}
