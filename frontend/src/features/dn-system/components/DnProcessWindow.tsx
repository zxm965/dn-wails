import { Play, RefreshCw, Skull } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button, SpinnerIcon } from '@/shared/components/ui'

import { PROCESS_NAME, PROCESS_CONTROL_SUPPORTED } from '../api/dnProcessApi'
import { useDnProcessList } from '../hooks/useDnProcessList'
import { useDnProcessShortcut } from '../hooks/useDnProcessShortcut'

import { styles } from './DnProcessWindow.css'

export function DnProcessWindow() {
  const processes = useDnProcessList()
  const { shortcutKey, busy, launching, status, clearStatus, run, launch } = useDnProcessShortcut(
    processes.onTerminated,
    processes.refreshAfterLaunch,
  )
  const [focused, setFocused] = useState(() => document.hasFocus())
  const statusText = !PROCESS_CONTROL_SUPPORTED ? '当前系统暂不支持' : processes.error || status
  const refresh = useCallback(() => {
    clearStatus()
    void processes.refresh()
  }, [clearStatus, processes.refresh])

  useEffect(() => {
    refresh()
    const focus = () => {
      setFocused(true)
      refresh()
    }
    const blur = () => setFocused(false)
    window.addEventListener('focus', focus)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('focus', focus)
      window.removeEventListener('blur', blur)
    }
  }, [refresh])

  return (
    <main className={styles.window}>
      <div className={styles.header}>
        <p className={styles.hint} title={`部分键盘需按 Fn + ${shortcutKey}`}>
          {focused ? '快捷键' : '激活后按'} {shortcutKey} / Fn+{shortcutKey}
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
        <Button variant='secondary' disabled={busy || !PROCESS_CONTROL_SUPPORTED} onClick={() => void launch()}>
          <SpinnerIcon icon={Play} spinning={launching} aria-hidden='true' />
          {launching ? '启动中…' : '启动'}
        </Button>
        <Button variant='danger' disabled={busy || !PROCESS_CONTROL_SUPPORTED} onClick={() => void run()}>
          <Skull aria-hidden='true' />
          {busy && !launching ? '终结中…' : `终结 ${PROCESS_NAME}`}
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
