import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { isWindows } from '@/shared/lib/platform'

import {
  getDragonNestShortcutStatus,
  retryDragonNestShortcut,
  onDragonNestShortcutChanged,
  getProcessErrorMessage,
  type DnShortcutStatus,
} from '../api/dnProcessApi'

export interface DnShortcutState {
  state: DnShortcutStatus | null
  summary: string
  result: string
  retrying: boolean
  retry: () => Promise<void>
}

export function useDnShortcut(): DnShortcutState {
  const [state, setState] = useState<DnShortcutStatus | null>(null)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const mounted = useRef(false)
  const retryInFlight = useRef(false)
  const accept = (next: DnShortcutStatus) => {
    if (!mounted.current) return
    setState((previous) => (!previous || next.revision >= previous.revision ? next : previous))
    setError('')
  }
  const onStatusReceived = useEffectEvent(accept)
  useEffect(() => {
    mounted.current = true
    let disposed = false
    let request = 0
    const unsubscribe = onDragonNestShortcutChanged((next) => {
      request++
      onStatusReceived(next)
    })
    const refresh = () => {
      const current = ++request
      void getDragonNestShortcutStatus().then(
        (next) => {
          if (!disposed && current === request) onStatusReceived(next)
        },
        (failure: unknown) => {
          if (!disposed && current === request) setError(getProcessErrorMessage(failure, '无法读取快捷键状态'))
        },
      )
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      disposed = true
      mounted.current = false
      unsubscribe()
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const retry = async () => {
    if (retryInFlight.current) return
    retryInFlight.current = true
    setRetrying(true)
    try {
      accept(await retryDragonNestShortcut())
    } catch (failure) {
      if (mounted.current) setError(getProcessErrorMessage(failure, '重试注册失败'))
    } finally {
      retryInFlight.current = false
      if (mounted.current) setRetrying(false)
    }
  }

  const source = state?.gameMode && isWindows() ? '游戏兼容 · Raw Input' : '标准全局'
  const summary = error
    ? error
    : !state
      ? '正在读取快捷键状态…'
      : state.registrationError
        ? `注册失败：${state.registrationError}`
        : !state.enabled
          ? '全局快捷键未启用，请在主窗口进程页启用'
          : state.registered
            ? `${source} · ${state.key} 已就绪 · 已收到 ${state.triggerCount} 次`
            : '等待运行时注册…'
  let result = ''
  if (state?.lastTriggeredAt) {
    const receivedAt = new Date(state.lastTriggeredAt).toLocaleTimeString('zh-CN', { hour12: false })
    const prefix = `${receivedAt} 已收到按键 · `
    result = state.running
      ? `${prefix}正在结束…`
      : state.lastError
        ? `${prefix}${getProcessErrorMessage(new Error(state.lastError), '结束失败')}`
        : `${prefix}已结束 ${state.lastProcess.name}（PID ${state.lastProcess.pid}）`
  }
  return { state, summary, result, retrying, retry }
}
