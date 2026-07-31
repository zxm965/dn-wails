import { useEffect, useState } from 'react'

import {
  getLifecycleStatus,
  onSecondInstanceLaunch,
  type LifecycleStatus,
  type SecondInstanceLaunch,
} from './appLifecycleApi'

const pendingRetryDelay = 250
const errorRetryDelay = 1000

export function useAppLifecycle(onSecondInstance?: (launch: SecondInstanceLaunch) => void) {
  const [status, setStatus] = useState<LifecycleStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let retryTimer: number | undefined

    function scheduleRefresh(delay: number) {
      retryTimer = window.setTimeout(refresh, delay)
    }

    async function refresh() {
      try {
        const nextStatus = await getLifecycleStatus()
        if (disposed) return

        setStatus(nextStatus)
        setError('')
        if (!nextStatus.ready) {
          scheduleRefresh(pendingRetryDelay)
        }
      } catch (statusError: unknown) {
        if (disposed) return

        setError(statusError instanceof Error ? statusError.message : '读取应用生命周期失败。')
        scheduleRefresh(errorRetryDelay)
      }
    }

    void refresh()

    return () => {
      disposed = true
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [])

  useEffect(() => {
    return onSecondInstanceLaunch((launch) => {
      setStatus((current) => (current ? { ...current, secondInstanceCount: current.secondInstanceCount + 1 } : current))
      onSecondInstance?.(launch)
    })
  }, [onSecondInstance])

  return { status, error }
}
