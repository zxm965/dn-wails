import { useCallback, useEffect, useRef, useState } from 'react'

import {
  PROCESS_CONTROL_SUPPORTED,
  getProcessErrorMessage,
  listDragonNestProcesses,
  type DragonNestProcess,
} from '../api/dnProcessApi'

interface DnProcessList {
  items: DragonNestProcess[]
  scanning: boolean
  error: string
  refresh: () => Promise<void>
  onTerminated: (process: DragonNestProcess) => void
}

export function useDnProcessList(): DnProcessList {
  const [items, setItems] = useState<DragonNestProcess[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const active = useRef(false)

  const refresh = useCallback(async () => {
    if (!active.current || !PROCESS_CONTROL_SUPPORTED) return
    const request = ++requestId.current
    setScanning(true)
    setError('')
    try {
      const next = await listDragonNestProcesses()
      if (request === requestId.current) setItems(next)
    } catch (scanError) {
      if (request === requestId.current) {
        setItems([])
        setError(getProcessErrorMessage(scanError, '扫描失败，请刷新重试。'))
      }
    } finally {
      if (request === requestId.current) setScanning(false)
    }
  }, [])

  const onTerminated = useCallback(
    (process: DragonNestProcess) => {
      if (!active.current) return
      setItems((current) => current.filter((item) => item.pid !== process.pid))
      // A fresh request supersedes any scan started before termination completed.
      void refresh()
    },
    [refresh],
  )

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      requestId.current++
    }
  }, [])

  return { items, scanning, error, refresh, onTerminated }
}
