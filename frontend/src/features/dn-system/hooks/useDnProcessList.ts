import { useCallback, useEffect, useRef, useState } from 'react'

import {
  PROCESS_CONTROL_SUPPORTED,
  getProcessErrorMessage,
  listDragonNestProcesses,
  onDragonNestProcessesChanged,
  type DragonNestProcess,
} from '../api/dnProcessApi'

interface DnProcessList {
  items: DragonNestProcess[]
  scanning: boolean
  error: string
  scanned: boolean
  scannedAt: Date | null
  refresh: () => Promise<void>
}

export function useDnProcessList(): DnProcessList {
  const [items, setItems] = useState<DragonNestProcess[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(PROCESS_CONTROL_SUPPORTED ? '' : '当前系统暂不支持此进程操作。')
  const [scanned, setScanned] = useState(false)
  const [scannedAt, setScannedAt] = useState<Date | null>(null)
  const requestId = useRef(0)
  const active = useRef(false)
  const cancelWait = useRef<(() => void) | null>(null)

  const scan = useCallback(async (waitForProcess: boolean): Promise<boolean> => {
    if (!active.current || !PROCESS_CONTROL_SUPPORTED) return false
    cancelWait.current?.()
    const request = ++requestId.current
    setScanning(true)
    setError('')
    try {
      // Startup is asynchronous; retry only this explicit launch for up to five seconds.
      for (let attempt = 0; attempt <= (waitForProcess ? 10 : 0); attempt++) {
        const next = await listDragonNestProcesses()
        if (request !== requestId.current) return false
        setItems(next)
        setScanned(true)
        setScannedAt(new Date())
        if (next.length) return true
        if (!waitForProcess || attempt === 10) break
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(() => {
            cancelWait.current = null
            resolve()
          }, 500)
          cancelWait.current = () => {
            window.clearTimeout(timer)
            cancelWait.current = null
            resolve()
          }
        })
        if (request !== requestId.current) return false
      }
    } catch (scanError) {
      if (request === requestId.current) {
        setItems([])
        setScanned(true)
        setError(getProcessErrorMessage(scanError, '扫描失败，请刷新重试。'))
      }
    } finally {
      if (request === requestId.current) setScanning(false)
    }
    return false
  }, [])

  const refresh = useCallback(async () => {
    await scan(false)
  }, [scan])
  useEffect(() => {
    active.current = true
    const unsubscribe = onDragonNestProcessesChanged((waitForProcess) => void scan(waitForProcess))
    const onFocus = () => void scan(false)
    void scan(false)
    window.addEventListener('focus', onFocus)
    return () => {
      active.current = false
      requestId.current++
      cancelWait.current?.()
      unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [scan])

  return { items, scanning, error, scanned, scannedAt, refresh }
}
