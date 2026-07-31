import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useFeedback } from '@/shared/feedback'

import {
  checkForApplicationUpdate,
  getApplicationUpdateInfo,
  installApplicationUpdate,
  type ApplicationUpdateInfo,
  type ApplicationUpdateStatus,
} from '../api/appUpdateApi'

interface AppUpdateContextValue {
  info: ApplicationUpdateInfo | null
  status: ApplicationUpdateStatus | null
  error: string
  isLoading: boolean
  isChecking: boolean
  isInstalling: boolean
  checkForUpdates: (manual?: boolean) => Promise<ApplicationUpdateStatus | null>
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null)

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { confirm, notify } = useFeedback()
  const [info, setInfo] = useState<ApplicationUpdateInfo | null>(null)
  const [status, setStatus] = useState<ApplicationUpdateStatus | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const autoCheckStartedRef = useRef(false)
  const operationRef = useRef<Promise<ApplicationUpdateStatus | null> | null>(null)

  const checkForUpdates = useCallback(
    (manual = true) => {
      if (operationRef.current) return operationRef.current

      const operation = (async () => {
        setIsChecking(true)
        setError('')
        try {
          const nextStatus = await checkForApplicationUpdate()
          setStatus(nextStatus)
          if (!nextStatus.updateAvailable) {
            if (manual) {
              notify({
                title: '当前已是最新版',
                message: `当前版本 ${nextStatus.currentVersion}`,
                tone: 'success',
              })
            }
            return nextStatus
          }

          const accepted = await confirm({
            title: `发现新版本 ${nextStatus.latestVersion}`,
            message: `当前版本为 ${nextStatus.currentVersion}。是否立即下载并安装新版本？应用将在准备完成后自动重启。`,
            confirmLabel: '立即更新',
            cancelLabel: '稍后再说',
          })
          if (!accepted) return nextStatus

          setIsInstalling(true)
          notify({
            title: '正在准备更新',
            message: '正在下载并校验安装包，请勿关闭应用。',
            duration: 10000,
          })
          try {
            await installApplicationUpdate(nextStatus.latestVersion)
            notify({ title: '更新已准备完成', message: '应用即将重启。', tone: 'success', duration: 10000 })
          } catch (installError: unknown) {
            const message = errorMessage(installError, '安装应用更新失败。')
            setError(message)
            notify({ title: '更新失败', message, tone: 'error', duration: 8000 })
            return nextStatus
          } finally {
            setIsInstalling(false)
          }
          return nextStatus
        } catch (checkError: unknown) {
          const message = errorMessage(checkError, '检查应用更新失败。')
          setError(message)
          if (manual) {
            notify({ title: '检查更新失败', message, tone: 'error' })
          }
          return null
        } finally {
          setIsChecking(false)
          operationRef.current = null
        }
      })()

      operationRef.current = operation
      return operation
    },
    [confirm, notify],
  )

  useEffect(() => {
    let active = true
    void getApplicationUpdateInfo()
      .then((nextInfo) => {
        if (!active) return
        setInfo(nextInfo)
        if (nextInfo.configured && nextInfo.canInstall && !autoCheckStartedRef.current) {
          autoCheckStartedRef.current = true
          void checkForUpdates(false)
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError, '读取应用版本失败。'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [checkForUpdates])

  const value = useMemo<AppUpdateContextValue>(
    () => ({ info, status, error, isLoading, isChecking, isInstalling, checkForUpdates }),
    [checkForUpdates, error, info, isChecking, isInstalling, isLoading, status],
  )

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
}

export function useAppUpdate(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext)
  if (!value) throw new Error('useAppUpdate must be used inside AppUpdateProvider.')
  return value
}
