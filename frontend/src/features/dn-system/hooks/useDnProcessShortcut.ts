import { useCallback, useEffect, useRef, useState } from 'react'

import { useSettings } from '@/features/settings'

import {
  PROCESS_NAME,
  PROCESS_CONTROL_SUPPORTED,
  getProcessErrorMessage,
  killDragonNestProcess,
  type DragonNestProcess,
} from '../api/dnProcessApi'

export interface DnProcessShortcut {
  shortcutKey: string
  busy: boolean
  status: string
  clearStatus: () => void
  run: () => Promise<void>
}

export function useDnProcessShortcut(onSuccess?: (process: DragonNestProcess) => void): DnProcessShortcut {
  const { settings, isLoading, error } = useSettings()
  const shortcutKey = settings.dragonNest.localShortcutKey
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const clearStatus = useCallback(() => {
    if (!running.current) setStatus('')
  }, [])

  const run = useCallback(async () => {
    if (running.current || !PROCESS_CONTROL_SUPPORTED) return
    running.current = true
    setBusy(true)
    setStatus(`正在结束 ${PROCESS_NAME}…`)
    try {
      const process = await killDragonNestProcess()
      onSuccess?.(process)
      setStatus(`已结束 ${process.name}（PID ${process.pid}）`)
    } catch (error) {
      setStatus(getProcessErrorMessage(error, '结束失败，请重新扫描后重试。'))
    } finally {
      running.current = false
      setBusy(false)
    }
  }, [onSuccess])

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

  return { shortcutKey, busy, status, clearStatus, run }
}
