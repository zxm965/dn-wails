import {
  DeleteDnRole,
  DeleteDnWeeklyPlan,
  InitializeDnWeeklyPlans,
  ListAllDnWeeklyPlans,
  ListDnRoleOptions,
  ListDnRoles,
  ListDnWeeklyPlans,
  SaveDnRole,
  SaveDnWeeklyPlan,
  SyncDnWeeklyPlans,
} from '@bindings/cull-pear/internal/application/app'
import * as WailsDn from '@bindings/cull-pear/internal/dn/models'

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

export interface WeeklyPlan {
  id: number
  ownerId: number
  roleName: string
  profession: string
  priority: number
  remainingCommissionCount: number
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
  remainingCommissionCount: number
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
  roleProfessionId: number
  page: number
  pageSize: number
}

export interface ListData<T> {
  items: T[]
  meta: ListMeta
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
