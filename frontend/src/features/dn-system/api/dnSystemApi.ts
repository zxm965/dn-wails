import {
  ClaimDnMessageNotifications,
  DeleteDnRole,
  DeleteDnWeeklyPlan,
  GetDnMessageInbox,
  InitializeDnWeeklyPlans,
  ListAllDnWeeklyPlans,
  ListDnMessages,
  ListDnRoleOptions,
  ListDnRoles,
  ListDnWeeklyPlans,
  MarkAllDnMessagesRead,
  MarkDnMessageRead,
  PublishDnMessage,
  SaveDnRole,
  SaveDnWeeklyPlan,
  SyncDnOfficialMessages,
  SyncDnWeeklyPlans,
} from '@bindings/dn-wails/internal/application/app'
import * as WailsDn from '@bindings/dn-wails/internal/dn/models'

export interface ListMeta {
  total: number
  totalPages: number
  page: number
  pageSize: number
}

export interface RoleProfession {
  id: number
  ownerId: number
  roleName: string
  profession: string
  priority: number
  remark: string
  sortOrder: number
  weeklyPlanCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string
}

export interface RoleProfessionInput {
  id: number
  roleName: string
  profession: string
  priority: number
  remark: string
  sortOrder: number
}

export interface RoleProfessionQuery {
  roleName: string
  profession: string
  priority: number
  page: number
  pageSize: number
}

export interface WeeklyPlanCommission {
  id: number
  completed: boolean
}

export interface WeeklyPlanTicket {
  id: number
  expiresAt: string
}

export interface WeeklyPlan {
  id: number
  ownerId: number
  roleName: string
  profession: string
  priority: number
  nestCommissions: WeeklyPlanCommission[]
  nestTickets: WeeklyPlanTicket[]
  levelCommissionCount: number
  hasInvasion: boolean
  hasArk: boolean
  hasNightmare: boolean
  remark: string
  sortOrder: number
  roleProfessionId: number
  createdAt: string
  updatedAt: string
}

export interface WeeklyPlanInput {
  id: number
  roleProfessionId: number
  nestCommissions: WeeklyPlanCommission[]
  nestTickets: WeeklyPlanTicket[]
  levelCommissionCount: number
  hasInvasion: boolean
  hasArk: boolean
  hasNightmare: boolean
  remark: string
  sortOrder: number
}

export interface WeeklyPlanQuery {
  roleName: string
  profession: string
  priority: number
  nestCommission: string
  roleProfessionId: number
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
}

export interface ListData<T> {
  items: T[]
  meta: ListMeta
}

export interface SiteMessageList extends ListData<SiteMessage> {
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

export interface WeeklyPlanInitializationResult {
  count: number
  created: number
  updated: number
}

export interface WeeklyPlanSyncResult {
  created: number
  total: number
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function listRoles(query: RoleProfessionQuery): Promise<ListData<RoleProfession>> {
  return ListDnRoles(WailsDn.RoleProfessionQuery.createFrom(query))
}

export function listRoleOptions(): Promise<RoleProfession[]> {
  return ListDnRoleOptions()
}

export function saveRole(input: RoleProfessionInput): Promise<RoleProfession> {
  return SaveDnRole(WailsDn.RoleProfessionInput.createFrom(input))
}

export function deleteRole(id: number): Promise<RoleProfession> {
  return DeleteDnRole(id)
}

export async function listWeeklyPlans(query: WeeklyPlanQuery): Promise<ListData<WeeklyPlan>> {
  return ListDnWeeklyPlans(WailsDn.WeeklyPlanQuery.createFrom(query))
}

export function listAllWeeklyPlans(): Promise<WeeklyPlan[]> {
  return ListAllDnWeeklyPlans()
}

export function saveWeeklyPlan(input: WeeklyPlanInput): Promise<WeeklyPlan> {
  return SaveDnWeeklyPlan(WailsDn.WeeklyPlanInput.createFrom(input))
}

export function deleteWeeklyPlan(id: number): Promise<WeeklyPlan> {
  return DeleteDnWeeklyPlan(id)
}

export function initializeWeeklyPlans(): Promise<WeeklyPlanInitializationResult> {
  return InitializeDnWeeklyPlans()
}

export function syncWeeklyPlans(): Promise<WeeklyPlanSyncResult> {
  return SyncDnWeeklyPlans()
}

export async function listMessages(query: SiteMessageQuery): Promise<SiteMessageList> {
  return ListDnMessages(WailsDn.SiteMessageQuery.createFrom(query)) as Promise<SiteMessageList>
}

export function getMessageInbox(limit = 8): Promise<SiteMessageInbox> {
  return GetDnMessageInbox(limit) as Promise<SiteMessageInbox>
}

export function claimMessageNotifications(limit = 3): Promise<SiteMessageClaim> {
  return ClaimDnMessageNotifications(limit) as Promise<SiteMessageClaim>
}

export function markMessageRead(id: number): Promise<SiteMessage> {
  return MarkDnMessageRead(id) as Promise<SiteMessage>
}

export function markAllMessagesRead(): Promise<number> {
  return MarkAllDnMessagesRead()
}

export function publishMessage(input: SiteMessageInput): Promise<SiteMessage> {
  return PublishDnMessage(WailsDn.SiteMessageInput.createFrom(input)) as Promise<SiteMessage>
}

export function syncOfficialMessages(): Promise<OfficialMessageSyncResult> {
  return SyncDnOfficialMessages() as Promise<OfficialMessageSyncResult>
}
