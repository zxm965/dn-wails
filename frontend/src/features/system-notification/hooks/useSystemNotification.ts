import { Events } from '@wailsio/runtime'
import { useCallback, useEffect, useState } from 'react'

import {
  getSystemNotificationStatus,
  requestSystemNotificationPermission,
  sendMessageNotification,
  type MessageNotificationRequest,
} from '../api/systemNotificationApi'

const SYSTEM_NOTIFICATION_ACTIVATED_EVENT = 'system-notification:activated'

export type NotificationCapability = 'loading' | 'ready' | 'permission-required' | 'unsupported' | 'error'

export interface NotificationActivation {
  notificationId: string
  conversationId?: string
}

interface UseSystemNotificationOptions {
  onActivated?: (activation: NotificationActivation) => void
}

function isNotificationActivation(value: unknown): value is NotificationActivation {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const activation = value as Record<string, unknown>
  return (
    typeof activation.notificationId === 'string' &&
    (activation.conversationId === undefined || typeof activation.conversationId === 'string')
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '系统通知操作失败，请稍后重试。'
}

export function useSystemNotification({ onActivated }: UseSystemNotificationOptions = {}) {
  const [capability, setCapability] = useState<NotificationCapability>('loading')
  const [error, setError] = useState('')

  const refreshStatus = useCallback(async () => {
    setError('')

    try {
      const status = await getSystemNotificationStatus()
      if (!status.available) {
        setCapability('unsupported')
        return
      }

      setCapability(status.authorized ? 'ready' : 'permission-required')
    } catch (statusError: unknown) {
      setCapability('error')
      setError(errorMessage(statusError))
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    return Events.On(SYSTEM_NOTIFICATION_ACTIVATED_EVENT, (event) => {
      if (isNotificationActivation(event.data)) {
        onActivated?.(event.data)
      }
    })
  }, [onActivated])

  const requestPermission = useCallback(async () => {
    setError('')

    try {
      const authorized = await requestSystemNotificationPermission()
      setCapability(authorized ? 'ready' : 'permission-required')
      return authorized
    } catch (permissionError: unknown) {
      setCapability('error')
      setError(errorMessage(permissionError))
      return false
    }
  }, [])

  const notifyMessage = useCallback(async (request: MessageNotificationRequest) => {
    setError('')

    try {
      return await sendMessageNotification(request)
    } catch (notificationError: unknown) {
      setError(errorMessage(notificationError))
      throw notificationError
    }
  }, [])

  return {
    capability,
    error,
    refreshStatus,
    requestPermission,
    notifyMessage,
  }
}
