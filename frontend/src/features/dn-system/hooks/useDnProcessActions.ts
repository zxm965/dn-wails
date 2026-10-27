import { useRef, useState } from 'react'

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
import { useDnShortcut, type DnShortcutState } from './useDnShortcut'

export interface DnProcessActions {
  globalShortcut: DnShortcutState
  shortcutKey: string
  busy: boolean
  launching: boolean
  status: string
  clearStatus: () => void
  run: (target?: DragonNestProcess) => Promise<DragonNestProcess | null>
  launch: () => Promise<void>
}

export function useDnProcessActions(): DnProcessActions {
  const { settings } = useSettings()
  const globalShortcut = useDnShortcut()
  const shortcutKey = settings.dragonNest.localShortcutKey
  const running = useRef(false)
  const [operation, setOperation] = useState<'launch' | 'terminate' | null>(null)
  const [status, setStatus] = useState('')
  const clearStatus = () => {
    if (!running.current) setStatus('')
  }

  const run = async (target?: DragonNestProcess) => {
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
  }

  const launch = async () => {
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
  }

  return {
    globalShortcut,
    shortcutKey,
    busy: operation !== null || Boolean(globalShortcut.state?.running),
    launching: operation === 'launch',
    status,
    clearStatus,
    run,
    launch,
  }
}
