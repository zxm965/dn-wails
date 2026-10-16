import { useCallback, useEffect, useRef, useState } from 'react'

import { useSettings } from '@/features/settings'

import {
  PROCESS_NAME,
  PROCESS_CONTROL_SUPPORTED,
  getProcessErrorMessage,
  killDragonNestProcess,
  launchDragonNestProcess,
  terminateDragonNestProcess,
  type DragonNestProcess,
} from '../api/dnProcessApi'

export interface DnProcessActions {
  shortcutKey: string
  busy: boolean
  launching: boolean
  status: string
  clearStatus: () => void
  run: (target?: DragonNestProcess) => Promise<DragonNestProcess | null>
  launch: () => Promise<void>
}

export function useDnProcessActions(): DnProcessActions {
  const { settings, isLoading, error } = useSettings()
  const shortcutKey = settings.dragonNest.localShortcutKey
  const running = useRef(false)
  const [operation, setOperation] = useState<'launch' | 'terminate' | null>(null)
  const [status, setStatus] = useState('')
  const clearStatus = useCallback(() => {
    if (!running.current) setStatus('')
  }, [])

  const run = useCallback(async (target?: DragonNestProcess) => {
    if (running.current || !PROCESS_CONTROL_SUPPORTED) return null
    running.current = true
    setOperation('terminate')
    setStatus(`正在结束 ${PROCESS_NAME}…`)
    try {
      const process = await (target ? terminateDragonNestProcess(target) : killDragonNestProcess())
      setStatus(`已结束 ${process.name}（PID ${process.pid}）`)
      return process
    } catch (error) {
      setStatus(getProcessErrorMessage(error, '结束失败，请重新扫描后重试。'))
      return null
    } finally {
      running.current = false
      setOperation(null)
    }
  }, [])

  const launch = useCallback(async () => {
    if (running.current || !PROCESS_CONTROL_SUPPORTED) return
    running.current = true
    setOperation('launch')
    setStatus(`正在启动 ${PROCESS_NAME}…`)
    try {
      await launchDragonNestProcess()
      setStatus('已发送启动请求')
    } catch (error) {
      setStatus(getProcessErrorMessage(error, '启动失败，请重试。'))
    } finally {
      running.current = false
      setOperation(null)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        isLoading ||
        Boolean(error) ||
        event.key !== shortcutKey ||
        event.repeat ||
        event.isComposing ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.metaKey ||
        !document.hasFocus()
      )
        return
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="combobox"], [role="listbox"]',
        )
      )
        return
      event.preventDefault()
      void run()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [run, shortcutKey, isLoading, error])

  return { shortcutKey, busy: operation !== null, launching: operation === 'launch', status, clearStatus, run, launch }
}
