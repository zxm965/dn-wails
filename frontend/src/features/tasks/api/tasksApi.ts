import {
  ClaimDueTaskReminders,
  DeleteCompletedTasks,
  DeleteTask,
  DeleteTaskList,
  ReorderTaskLists,
  ReorderTasks,
  SaveTask,
  SaveTaskList,
  SetTaskCompleted,
  TaskWorkspace,
} from '@bindings/cull-pear/internal/application/app'
import * as WailsTasks from '@bindings/cull-pear/internal/tasks/models'

export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RepeatEndMode = 'never' | 'date' | 'count'

export interface RepeatRule {
  frequency: RepeatFrequency
  interval: number
  endMode: RepeatEndMode
  endDate: string
  count: number
}

export interface TaskList {
  id: number
  title: string
  sortOrder: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface TaskItem {
  id: number
  listId: number
  parentId: number
  title: string
  details: string
  scheduledAt: string
  deadlineAt: string
  timeZone: string
  starred: boolean
  starredAt: string
  completedAt: string
  sortOrder: number
  repeat: RepeatRule
  repeatSeriesId: number
  createdAt: string
  updatedAt: string
}

export interface TaskWorkspace {
  lists: TaskList[]
  tasks: TaskItem[]
}

export interface TaskInput {
  id: number
  listId: number
  parentId: number
  title: string
  details: string
  scheduledAt: string
  deadlineAt: string
  timeZone: string
  starred: boolean
  repeat: RepeatRule
}

function normalizeRepeat(value: WailsTasks.RepeatRule): RepeatRule {
  return {
    frequency: value.frequency as RepeatFrequency,
    interval: value.interval,
    endMode: value.endMode as RepeatEndMode,
    endDate: value.endDate,
    count: value.count,
  }
}

function normalizeList(value: WailsTasks.List): TaskList {
  return { ...value }
}

function normalizeTask(value: WailsTasks.Task): TaskItem {
  return { ...value, repeat: normalizeRepeat(value.repeat) }
}

function normalizeWorkspace(value: WailsTasks.Workspace): TaskWorkspace {
  return { lists: value.lists.map(normalizeList), tasks: value.tasks.map(normalizeTask) }
}

export async function getTaskWorkspace(): Promise<TaskWorkspace> {
  return normalizeWorkspace(await TaskWorkspace())
}

export async function claimDueTaskReminders(limit = 20): Promise<TaskItem[]> {
  return (await ClaimDueTaskReminders(limit)).map(normalizeTask)
}

export async function saveTaskList(id: number, title: string): Promise<TaskList> {
  return normalizeList(await SaveTaskList(WailsTasks.ListInput.createFrom({ id, title })))
}

export function deleteTaskList(id: number): Promise<void> {
  return DeleteTaskList(id)
}

export function reorderTaskLists(orderedIds: number[]): Promise<void> {
  return ReorderTaskLists(WailsTasks.ReorderListsInput.createFrom({ orderedIds }))
}

export async function saveTask(input: TaskInput): Promise<TaskItem> {
  return normalizeTask(await SaveTask(WailsTasks.TaskInput.createFrom(input)))
}

export async function setTaskCompleted(id: number, completed: boolean): Promise<TaskWorkspace> {
  return normalizeWorkspace(await SetTaskCompleted(id, completed))
}

export function deleteTask(id: number, deleteSeries = false): Promise<void> {
  return DeleteTask(id, deleteSeries)
}

export function deleteCompletedTasks(listId: number): Promise<number> {
  return DeleteCompletedTasks(listId)
}

export function reorderTasks(listId: number, parentId: number, orderedIds: number[]): Promise<void> {
  return ReorderTasks(WailsTasks.ReorderTasksInput.createFrom({ listId, parentId, orderedIds }))
}
