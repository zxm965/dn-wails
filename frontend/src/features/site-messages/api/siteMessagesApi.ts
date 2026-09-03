import {
  CheckOfficialSiteMessagesOnLogin,
  ClaimSiteMessageNotifications,
  DeleteSiteMessage,
  GetSiteMessageInbox,
  ListSiteMessages,
  MarkAllSiteMessagesRead,
  MarkSiteMessageNotified,
  MarkSiteMessageRead,
  PublishSiteMessage,
  SyncOfficialSiteMessages,
  UpdateSiteMessage,
} from '@bindings/cull-pear/internal/application/app'
import * as WailsDn from '@bindings/cull-pear/internal/dn/models'

export interface ListMeta {
  total: number
  totalPages: number
  page: number
  pageSize: number
}

export type SiteMessageLevel = 'info' | 'success' | 'warning' | 'error'
export type SiteMessageTarget = '_self' | '_blank'

export interface SiteMessage {
  id: number
  source: string
  sourceKey: string
  level: SiteMessageLevel
  title: string
  content: string
  actionLabel: string
  actionUrl: string
  actionTarget: SiteMessageTarget
  popup: boolean
  status: number
  publishedAt: string
  expiresAt: string
  createdBy: number
  metadata?: {
    categoryCode: string
    isTop: boolean
    isHot: boolean
    sourceId: number
  }
  readAt: string
  isRead: boolean
}

export interface SiteMessageInput {
  level: SiteMessageLevel
  title: string
  content: string
  actionLabel: string
  actionUrl: string
  actionTarget: SiteMessageTarget
  popup: boolean
  publishedAt: string
  expiresAt: string
}

export interface SiteMessageQuery {
  keyword: string
  readStatus: 'all' | 'read' | 'unread'
  page: number
  pageSize: number
  manage?: boolean
}

export interface SiteMessageList {
  items: SiteMessage[]
  meta: ListMeta
  unreadCount: number
  lastSyncedAt: string
  syncError: string
}

export interface SiteMessageInbox {
  items: SiteMessage[]
  unreadCount: number
  lastSyncedAt: string
  syncError: string
}

export interface SiteMessageClaim {
  items: SiteMessage[]
}

export interface OfficialMessageSyncResult {
  skipped: boolean
  fetched: number
  published: number
  syncedAt: string
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function listMessages(query: SiteMessageQuery): Promise<SiteMessageList> {
  return ListSiteMessages(WailsDn.SiteMessageQuery.createFrom(query)) as Promise<SiteMessageList>
}

export function getMessageInbox(limit = 8): Promise<SiteMessageInbox> {
  return GetSiteMessageInbox(limit) as Promise<SiteMessageInbox>
}

export function claimMessageNotifications(limit = 3): Promise<SiteMessageClaim> {
  return ClaimSiteMessageNotifications(limit) as Promise<SiteMessageClaim>
}

export function markMessageNotified(id: number): Promise<void> {
  return MarkSiteMessageNotified(id)
}

export function markMessageRead(id: number): Promise<SiteMessage> {
  return MarkSiteMessageRead(id) as Promise<SiteMessage>
}

export function markAllMessagesRead(): Promise<number> {
  return MarkAllSiteMessagesRead()
}

export function publishMessage(input: SiteMessageInput): Promise<SiteMessage> {
  return PublishSiteMessage(WailsDn.SiteMessageInput.createFrom(input)) as Promise<SiteMessage>
}

export function updateMessage(id: number, input: SiteMessageInput): Promise<SiteMessage> {
  return UpdateSiteMessage(id, WailsDn.SiteMessageInput.createFrom(input)) as Promise<SiteMessage>
}

export function deleteMessage(id: number): Promise<SiteMessage> {
  return DeleteSiteMessage(id) as Promise<SiteMessage>
}

export function syncOfficialMessages(): Promise<OfficialMessageSyncResult> {
  return SyncOfficialSiteMessages() as Promise<OfficialMessageSyncResult>
}

export function checkOfficialMessagesOnLogin(): Promise<OfficialMessageSyncResult> {
  return CheckOfficialSiteMessagesOnLogin() as Promise<OfficialMessageSyncResult>
}
