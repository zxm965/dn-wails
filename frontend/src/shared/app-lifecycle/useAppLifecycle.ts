import { useEffect, useState } from 'react'

import {
  getLifecycleStatus,
  onSecondInstanceLaunch,
  type LifecycleStatus,
  type SecondInstanceLaunch,
} from './appLifecycleApi'

export function useAppLifecycle(onSecondInstance?: (launch: SecondInstanceLaunch) => void) {
  const [status, setStatus] = useState<LifecycleStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void getLifecycleStatus()
      .then(setStatus)
      .catch((statusError: unknown) => {
        setError(statusError instanceof Error ? statusError.message : '读取应用生命周期失败。')
      })
  }, [])

  useEffect(() => {
    return onSecondInstanceLaunch((launch) => {
      setStatus((current) => (current ? { ...current, secondInstanceCount: current.secondInstanceCount + 1 } : current))
      onSecondInstance?.(launch)
    })
  }, [onSecondInstance])

  return { status, error }
}
