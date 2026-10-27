import { Events } from '@wailsio/runtime'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useFeedback } from '@/shared/feedback'
import { getErrorMessage } from '@/shared/lib/errorMessage'
import { openExternalURL } from '@/shared/native-kit'

import {
  checkForApplicationUpdate,
  getApplicationUpdateInfo,
  installApplicationUpdate,
  type ApplicationUpdateInfo,
  type ApplicationUpdateProgress,
  type ApplicationUpdateStatus,
} from '../api/appUpdateApi'
import { UpdateReleaseDialog } from '../components/UpdateReleaseDialog'

interface AppUpdateContextValue {
  info: ApplicationUpdateInfo | null
  status: ApplicationUpdateStatus | null
  error: string
  isLoading: boolean
  isChecking: boolean
  isInstalling: boolean
  progress: ApplicationUpdateProgress | null
  showReleaseNotes: () => void
  checkForUpdates: (manual?: boolean) => Promise<ApplicationUpdateStatus | null>
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null)

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) return error
  return getErrorMessage(error, fallback)
}

function isApplicationUpdateProgress(value: unknown): value is ApplicationUpdateProgress {
  if (typeof value !== 'object' || value === null) return false
  const progress = value as Record<string, unknown>
  return (
    typeof progress.version === 'string' &&
    (progress.phase === 'downloading' || progress.phase === 'installing') &&
    typeof progress.downloadedBytes === 'number' &&
    typeof progress.totalBytes === 'number' &&
    typeof progress.percent === 'number'
  )
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { notify } = useFeedback()
  const [info, setInfo] = useState<ApplicationUpdateInfo | null>(null)
  const [status, setStatus] = useState<ApplicationUpdateStatus | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [progress, setProgress] = useState<ApplicationUpdateProgress | null>(null)
  const [dialog, setDialog] = useState<{ status: ApplicationUpdateStatus; confirmUpdate: boolean } | null>(null)
  const decisionRef = useRef<((accepted: boolean) => void) | null>(null)
  const mountedRef = useRef(true)
  const manualCheckRequestedRef = useRef(false)
  const autoCheckStartedRef = useRef(false)
  const operationRef = useRef<Promise<ApplicationUpdateStatus | null> | null>(null)

  const finishDialog = useCallback((accepted: boolean) => {
    setDialog(null)
    const resolve = decisionRef.current
    decisionRef.current = null
    resolve?.(accepted)
  }, [])

  const showReleaseNotes = useCallback(() => {
    if (status && !operationRef.current && !isInstalling) {
      setDialog({ status, confirmUpdate: false })
    }
  }, [isInstalling, status])

  const openReleaseLink = useCallback(
    (url: string) => {
      void openExternalURL(url).catch((linkError: unknown) => {
        notify({ title: '链接打开失败', message: errorMessage(linkError, '请稍后重试。'), tone: 'error' })
      })
    },
    [notify],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      decisionRef.current?.(false)
      decisionRef.current = null
    }
  }, [])

  const checkForUpdates = useCallback(
    (manual = true) => {
      if (manual) manualCheckRequestedRef.current = true
      if (operationRef.current) return operationRef.current

      const operation = (async () => {
        setIsChecking(true)
        setError('')
        try {
          const nextStatus = await checkForApplicationUpdate()
          if (!mountedRef.current) return null
          setStatus(nextStatus)
          setIsChecking(false)
          if (!nextStatus.updateAvailable) {
            if (manualCheckRequestedRef.current) setDialog({ status: nextStatus, confirmUpdate: false })
            return nextStatus
          }

          const accepted = await new Promise<boolean>((resolve) => {
            decisionRef.current = resolve
            setDialog({ status: nextStatus, confirmUpdate: true })
          })
          if (!accepted) return nextStatus

          setIsInstalling(true)
          setProgress({
            version: nextStatus.latestVersion,
            phase: 'downloading',
            downloadedBytes: 0,
            totalBytes: 0,
            percent: 0,
          })
          notify({
            title: '正在准备更新',
            message: '正在下载并校验安装包，请勿关闭应用。',
            duration: 10000,
          })
          try {
            await installApplicationUpdate(nextStatus.latestVersion)
            notify({
              title: '更新已准备完成',
              message: '应用即将自动安装更新并重启。',
              tone: 'success',
              duration: 10000,
            })
          } catch (installError: unknown) {
            const message = errorMessage(installError, '安装应用更新失败。')
            setError(message)
            setProgress(null)
            notify({ title: '更新失败', message, tone: 'error', duration: 8000 })
            return nextStatus
          } finally {
            setIsInstalling(false)
          }
          return nextStatus
        } catch (checkError: unknown) {
          if (!mountedRef.current) return null
          const message = errorMessage(checkError, '检查应用更新失败。')
          setError(message)
          if (manualCheckRequestedRef.current) {
            notify({ title: '检查更新失败', message, tone: 'error' })
          }
          return null
        } finally {
          if (mountedRef.current) setIsChecking(false)
          operationRef.current = null
          manualCheckRequestedRef.current = false
        }
      })()

      operationRef.current = operation
      return operation
    },
    [notify],
  )

  useEffect(() => {
    let active = true
    void getApplicationUpdateInfo()
      .then((nextInfo) => {
        if (!active) return
        setInfo(nextInfo)
        if (nextInfo.lastUpdateError) {
          setError(nextInfo.lastUpdateError)
          notify({ title: '上次更新未完成', message: nextInfo.lastUpdateError, tone: 'error', duration: 10000 })
          return
        }
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
  }, [checkForUpdates, notify])

  useEffect(() => {
    return Events.On('app-update:progress', (event) => {
      if (isApplicationUpdateProgress(event.data)) setProgress(event.data)
    })
  }, [])

  const value = useMemo<AppUpdateContextValue>(
    () => ({ info, status, error, isLoading, isChecking, isInstalling, progress, checkForUpdates, showReleaseNotes }),
    [checkForUpdates, error, info, isChecking, isInstalling, isLoading, progress, status, showReleaseNotes],
  )

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      {dialog && (
        <UpdateReleaseDialog
          status={dialog.status}
          confirmUpdate={dialog.confirmUpdate}
          canInstall={info?.canInstall ?? false}
          onDecision={finishDialog}
          onOpenLink={openReleaseLink}
        />
      )}
    </AppUpdateContext.Provider>
  )
}

export function useAppUpdate(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext)
  if (!value) throw new Error('useAppUpdate must be used inside AppUpdateProvider.')
  return value
}
