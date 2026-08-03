import {
  GetSystemNotificationStatus,
  RequestSystemNotificationPermission,
  SendMessageNotification,
} from '@bindings/dn-wails/internal/application/app'

export interface SystemNotificationStatus {
  available: boolean
  authorized: boolean
}

export interface MessageNotificationRequest {
  id?: string
  sender: string
  content: string
  conversationId?: string
}

export async function getSystemNotificationStatus(): Promise<SystemNotificationStatus> {
  const status = await GetSystemNotificationStatus()

  return {
    available: status.available,
    authorized: status.authorized,
  }
}

export function requestSystemNotificationPermission(): Promise<boolean> {
  return RequestSystemNotificationPermission()
}

export function sendMessageNotification(request: MessageNotificationRequest): Promise<string> {
  return SendMessageNotification({
    id: request.id ?? '',
    sender: request.sender,
    content: request.content,
    conversationId: request.conversationId ?? '',
  })
}
