import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Repeat2,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ListState,
  PageHeader,
  Select,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import {
  deleteCompletedTasks,
  deleteTask,
  deleteTaskList,
  getTaskWorkspace,
  reorderTaskLists,
  reorderTasks,
  saveTask,
  saveTaskList,
  setTaskCompleted,
  type RepeatFrequency,
  type TaskInput,
  type TaskItem,
  type TaskList,
  type TaskWorkspace,
} from '../api/tasksApi'
import { TaskEditorDialog } from './TaskEditorDialog'

import { styles } from './TasksPanel.css'

const cx = createScopedClassNames(styles)

type SelectedList = number | 'starred'
type SortMode = 'manual' | 'date' | 'deadline' | 'starred' | 'title'

const sortOptions = [
  { value: 'manual', label: '我的顺序' },
  { value: 'date', label: '日期' },
  { value: 'deadline', label: '截止时间' },
  { value: 'starred', label: '最近加星标' },
  { value: 'title', label: '标题' },
] as const

const emptyRepeat = {
  frequency: 'none' as RepeatFrequency,
  interval: 1,
  endMode: 'never' as const,
  endDate: '',
  count: 0,
}

function taskInput(task: TaskItem): TaskInput {
  return {
    id: task.id,
    listId: task.listId,
    parentId: task.parentId,
    title: task.title,
    details: task.details,
    scheduledAt: task.scheduledAt,
    deadlineAt: task.deadlineAt,
    timeZone: task.timeZone,
    starred: task.starred,
    repeat: { ...task.repeat },
  }
}

function emptyTask(listId: number, parentId = 0): TaskInput {
  return {
    id: 0,
    listId,
    parentId,
    title: '',
    details: '',
    scheduledAt: '',
    deadlineAt: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    starred: false,
    repeat: { ...emptyRepeat },
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function sortTaskItems(items: TaskItem[], mode: SortMode): TaskItem[] {
  return [...items].sort((left, right) => {
    if (mode === 'title') return left.title.localeCompare(right.title, 'zh-CN')
    if (mode === 'starred') {
      if (left.starred !== right.starred) return left.starred ? -1 : 1
      return right.starredAt.localeCompare(left.starredAt)
    }
    if (mode === 'date' || mode === 'deadline') {
      const leftDate = mode === 'date' ? left.scheduledAt : left.deadlineAt
      const rightDate = mode === 'date' ? right.scheduledAt : right.deadlineAt
      if (!leftDate) return rightDate ? 1 : left.sortOrder - right.sortOrder
      if (!rightDate) return -1
      return leftDate.localeCompare(rightDate)
    }
    return left.sortOrder - right.sortOrder || left.id - right.id
  })
}

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function repeatLabel(task: TaskItem): string {
  if (task.repeat.frequency === 'none') return ''
  const unit = { daily: '天', weekly: '周', monthly: '月', yearly: '年' }[task.repeat.frequency]
  return task.repeat.interval === 1 ? `每${unit}` : `每 ${task.repeat.interval} ${unit}`
}

export function TasksPanel() {
  const { notify, confirm } = useFeedback()
  const [workspace, setWorkspace] = useState<TaskWorkspace>({ lists: [], tasks: [] })
  const [selectedList, setSelectedList] = useState<SelectedList>('starred')
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [search, setSearch] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [editorTask, setEditorTask] = useState<TaskInput | null>(null)
  const [persistedEditorTask, setPersistedEditorTask] = useState<TaskItem | undefined>()
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [listDraft, setListDraft] = useState<{ id: number; title: string }>({ id: 0, title: '' })
  const [activeListActionsID, setActiveListActionsID] = useState<number | null>(null)
  const [draggedTaskID, setDraggedTaskID] = useState<number | null>(null)

  const activeList = selectedList === 'starred' ? undefined : workspace.lists.find((list) => list.id === selectedList)
  const selectedListID = activeList?.id ?? workspace.lists[0]?.id ?? 0
  const keyword = search.trim().toLocaleLowerCase()

  const visibleTasks = useMemo(() => {
    const source = workspace.tasks.filter((task) => {
      if (selectedList === 'starred') return task.starred
      return task.listId === selectedList
    })
    return source.filter((task) => !keyword || `${task.title}\n${task.details}`.toLocaleLowerCase().includes(keyword))
  }, [keyword, selectedList, workspace.tasks])

  const pendingTasks = useMemo(
    () =>
      sortTaskItems(
        visibleTasks.filter((task) => !task.completedAt && (selectedList === 'starred' || task.parentId === 0)),
        sortMode,
      ),
    [selectedList, sortMode, visibleTasks],
  )
  const completedTasks = useMemo(
    () =>
      sortTaskItems(
        visibleTasks.filter((task) => task.completedAt && (selectedList === 'starred' || task.parentId === 0)),
        sortMode,
      ),
    [selectedList, sortMode, visibleTasks],
  )

  async function load() {
    setLoading(true)
    try {
      const next = await getTaskWorkspace()
      setWorkspace(next)
      setSelectedList((current) => {
        if (current === 'starred') return next.lists[0]?.id ?? 'starred'
        return next.lists.some((list) => list.id === current) ? current : (next.lists[0]?.id ?? 'starred')
      })
      setLoadError('')
    } catch (error) {
      setLoadError(errorMessage(error, '任务加载失败。'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openNewTask(parentId = 0) {
    if (!selectedListID) return
    setPersistedEditorTask(undefined)
    setEditorTask(emptyTask(selectedListID, parentId))
  }

  function openTask(task: TaskItem) {
    setPersistedEditorTask(task)
    setEditorTask(taskInput(task))
  }

  async function submitQuickTask(event: FormEvent) {
    event.preventDefault()
    const title = quickTitle.trim()
    if (!title || !selectedListID || working) return
    setWorking(true)
    try {
      const created = await saveTask({ ...emptyTask(selectedListID), title })
      setWorkspace((current) => ({ ...current, tasks: [...current.tasks, created] }))
      setQuickTitle('')
    } catch (error) {
      notify({ title: '任务创建失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setWorking(false)
    }
  }

  async function persistTask(input: TaskInput) {
    setWorking(true)
    try {
      const saved = await saveTask(input)
      setWorkspace((current) => ({
        ...current,
        tasks: [...current.tasks.filter((task) => task.id !== saved.id), saved],
      }))
      setEditorTask(null)
      setPersistedEditorTask(undefined)
      notify({ title: input.id ? '任务已更新' : '任务已添加', tone: 'success' })
    } catch (error) {
      notify({ title: '任务保存失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setWorking(false)
    }
  }

  async function toggleCompleted(task: TaskItem) {
    try {
      const next = await setTaskCompleted(task.id, !task.completedAt)
      setWorkspace(next)
      notify({ title: task.completedAt ? '任务已恢复' : '任务已完成', tone: 'success' })
    } catch (error) {
      notify({ title: '任务状态更新失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  async function toggleStar(task: TaskItem) {
    try {
      const saved = await saveTask({ ...taskInput(task), starred: !task.starred })
      setWorkspace((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === saved.id ? saved : item)),
      }))
    } catch (error) {
      notify({ title: '星标更新失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  async function removeTask(task: TaskItem, deleteSeries: boolean) {
    const accepted = await confirm({
      title: deleteSeries ? '删除重复任务系列' : '删除任务',
      message: deleteSeries ? `确定删除「${task.title}」的全部重复任务吗？` : `确定删除「${task.title}」及其子任务吗？`,
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!accepted) return
    setWorking(true)
    try {
      await deleteTask(task.id, deleteSeries)
      await load()
      setEditorTask(null)
      setPersistedEditorTask(undefined)
      notify({ title: '任务已删除', tone: 'success' })
    } catch (error) {
      notify({ title: '任务删除失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setWorking(false)
    }
  }

  async function clearCompleted() {
    if (!activeList || completedTasks.length === 0) return
    const accepted = await confirm({
      title: '删除已完成任务',
      message: `确定永久移除「${activeList.title}」中的全部已完成任务吗？`,
      confirmLabel: '全部删除',
      tone: 'danger',
    })
    if (!accepted) return
    try {
      const count = await deleteCompletedTasks(activeList.id)
      await load()
      notify({ title: `已删除 ${count} 条已完成任务`, tone: 'success' })
    } catch (error) {
      notify({ title: '清理失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  function openListDialog(list?: TaskList) {
    setListDraft({ id: list?.id ?? 0, title: list?.title ?? '' })
    setListDialogOpen(true)
  }

  async function persistList(event: FormEvent) {
    event.preventDefault()
    if (!listDraft.title.trim() || working) return
    setWorking(true)
    try {
      const saved = await saveTaskList(listDraft.id, listDraft.title)
      setWorkspace((current) => ({
        ...current,
        lists: [...current.lists.filter((list) => list.id !== saved.id), saved].sort(
          (left, right) => left.sortOrder - right.sortOrder,
        ),
      }))
      setSelectedList(saved.id)
      setListDialogOpen(false)
    } catch (error) {
      notify({ title: '清单保存失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setWorking(false)
    }
  }

  async function removeList(list: TaskList) {
    const accepted = await confirm({
      title: '删除任务清单',
      message: `确定删除「${list.title}」及其中的全部任务吗？至少需要保留一个清单。`,
      confirmLabel: '删除清单',
      tone: 'danger',
    })
    if (!accepted) return
    try {
      await deleteTaskList(list.id)
      await load()
      setListDialogOpen(false)
      notify({ title: '清单已删除', tone: 'success' })
    } catch (error) {
      notify({ title: '清单删除失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  async function moveList(list: TaskList, direction: -1 | 1) {
    const index = workspace.lists.findIndex((item) => item.id === list.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= workspace.lists.length) return
    const next = [...workspace.lists]
    ;[next[index], next[target]] = [next[target], next[index]]
    setWorkspace((current) => ({ ...current, lists: next }))
    try {
      await reorderTaskLists(next.map((item) => item.id))
    } catch (error) {
      await load()
      notify({ title: '清单排序失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  async function dropTask(targetID: number) {
    if (!draggedTaskID || draggedTaskID === targetID || !activeList || sortMode !== 'manual') return
    const sourceTask = workspace.tasks.find((task) => task.id === draggedTaskID)
    const targetTask = workspace.tasks.find((task) => task.id === targetID)
    if (!sourceTask || !targetTask || sourceTask.parentId !== targetTask.parentId) return
    const roots = sortTaskItems(
      workspace.tasks.filter(
        (task) => task.listId === activeList.id && task.parentId === targetTask.parentId && !task.completedAt,
      ),
      'manual',
    )
    const from = roots.findIndex((task) => task.id === draggedTaskID)
    const to = roots.findIndex((task) => task.id === targetID)
    if (from < 0 || to < 0) return
    const next = [...roots]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDraggedTaskID(null)
    try {
      await reorderTasks(
        activeList.id,
        targetTask.parentId,
        next.map((task) => task.id),
      )
      await load()
    } catch (error) {
      notify({ title: '任务排序失败', message: errorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  function handleShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    if (event.key.toLocaleLowerCase() === 'n') {
      event.preventDefault()
      openNewTask()
    }
    if (event.key.toLocaleLowerCase() === 'f') {
      event.preventDefault()
      document.getElementById('tasks-search')?.focus()
    }
  }

  function renderTask(task: TaskItem, isSubtask = false) {
    const subtasks =
      selectedList === 'starred'
        ? []
        : sortTaskItems(
            workspace.tasks.filter(
              (item) => item.parentId === task.id && (!keyword || visibleTasks.some((match) => match.id === item.id)),
            ),
            sortMode,
          )
    const overdue = Boolean(task.deadlineAt && !task.completedAt && new Date(task.deadlineAt).getTime() < Date.now())
    const listTitle = workspace.lists.find((list) => list.id === task.listId)?.title
    return (
      <div key={task.id} className={cx(`tasks-item-group${isSubtask ? ' is-subtask' : ''}`)}>
        <article
          className={cx(`tasks-item${task.completedAt ? ' is-completed' : ''}`)}
          draggable={sortMode === 'manual' && selectedList !== 'starred' && !task.completedAt}
          onDragStart={() => setDraggedTaskID(task.id)}
          onDragEnd={() => setDraggedTaskID(null)}
          onDragOver={(event: DragEvent) => event.preventDefault()}
          onDrop={() => void dropTask(task.id)}
        >
          <Button
            className={cx('tasks-complete-button')}
            size='sm'
            variant='ghost'
            aria-label={task.completedAt ? '标记为未完成' : '标记为已完成'}
            title={task.completedAt ? '标记为未完成' : '标记为已完成'}
            onClick={() => void toggleCompleted(task)}
          >
            {task.completedAt ? <Check aria-hidden='true' /> : <Circle aria-hidden='true' />}
          </Button>
          <Button className={cx('tasks-item-content')} size='lg' variant='ghost' onClick={() => openTask(task)}>
            <span className={cx('tasks-item-title')}>{task.title}</span>
            <span className={cx('tasks-item-meta')}>
              {task.details && <span>{task.details}</span>}
              {task.scheduledAt && (
                <span>
                  <CalendarDays aria-hidden='true' /> {formatDate(task.scheduledAt)}
                </span>
              )}
              {task.deadlineAt && (
                <span className={cx(overdue ? 'is-overdue' : undefined)}>截止 {formatDate(task.deadlineAt)}</span>
              )}
              {task.repeat.frequency !== 'none' && (
                <span>
                  <Repeat2 aria-hidden='true' /> {repeatLabel(task)}
                </span>
              )}
              {selectedList === 'starred' && listTitle && <span>{listTitle}</span>}
            </span>
          </Button>
          {!task.completedAt && !isSubtask && task.repeat.frequency === 'none' && (
            <Button
              className={cx('tasks-icon-button')}
              size='sm'
              variant='ghost'
              title='添加子任务'
              aria-label='添加子任务'
              onClick={() => openNewTask(task.id)}
            >
              <Plus aria-hidden='true' />
            </Button>
          )}
          <Button
            className={cx(`tasks-icon-button${task.starred ? ' is-starred' : ''}`)}
            size='sm'
            variant='ghost'
            title={task.starred ? '取消星标' : '加星标'}
            aria-label={task.starred ? '取消星标' : '加星标'}
            onClick={() => void toggleStar(task)}
          >
            <Star aria-hidden='true' fill={task.starred ? 'currentColor' : 'none'} />
          </Button>
          <Button
            className={cx('tasks-icon-button')}
            size='sm'
            variant='ghost'
            title='编辑任务'
            aria-label='编辑任务'
            onClick={() => openTask(task)}
          >
            <MoreHorizontal aria-hidden='true' />
          </Button>
        </article>
        {subtasks.length > 0 && (
          <div className={cx('tasks-subtasks')}>{subtasks.map((item) => renderTask(item, true))}</div>
        )}
      </div>
    )
  }

  const activeTitle = selectedList === 'starred' ? '已加星标' : (activeList?.title ?? '任务清单')
  const parentTitle = editorTask?.parentId
    ? workspace.tasks.find((task) => task.id === editorTask.parentId)?.title
    : undefined

  return (
    <div className={cx('tasks-page')} onKeyDown={handleShortcut}>
      <PageHeader
        eyebrow='Task workspace'
        title='任务清单'
        subtitle='用清单、日期、重复计划和子任务管理每一件待办事项。'
        actions={
          <>
            <Button variant='outline' onClick={() => window.print()}>
              <Printer aria-hidden='true' />
              打印
            </Button>
            <Button disabled={!selectedListID} onClick={() => openNewTask()}>
              <Plus aria-hidden='true' />
              添加任务
            </Button>
          </>
        }
      />

      <section className={cx('tasks-workspace')}>
        <aside className={cx('tasks-lists-panel')}>
          <div className={cx('tasks-lists-header')}>
            <strong>任务清单</strong>
            <Button size='sm' variant='ghost' title='新建清单' aria-label='新建清单' onClick={() => openListDialog()}>
              <ListPlus aria-hidden='true' />
            </Button>
          </div>
          <Button
            className={cx(`tasks-list-button${selectedList === 'starred' ? ' is-active' : ''}`)}
            variant='ghost'
            onClick={() => setSelectedList('starred')}
          >
            <Star aria-hidden='true' />
            <span className={cx('tasks-list-label')}>已加星标</span>
            <small className={cx('tasks-list-count')}>
              {workspace.tasks.filter((task) => task.starred && !task.completedAt).length}
            </small>
          </Button>
          <div className={cx('tasks-lists')}>
            {workspace.lists.map((list, index) => (
              <div key={list.id} className={cx('tasks-list-row')}>
                <Button
                  className={cx(`tasks-list-button${selectedList === list.id ? ' is-active' : ''}`)}
                  variant='ghost'
                  onClick={() => setSelectedList(list.id)}
                >
                  <ClipboardCheck aria-hidden='true' />
                  <span className={cx('tasks-list-label')}>{list.title}</span>
                  <small className={cx('tasks-list-count')}>
                    {workspace.tasks.filter((task) => task.listId === list.id && !task.completedAt).length}
                  </small>
                </Button>
                <PopoverPrimitive.Root
                  open={activeListActionsID === list.id}
                  onOpenChange={(open) => setActiveListActionsID(open ? list.id : null)}
                >
                  <PopoverPrimitive.Trigger
                    className={cx('tasks-list-action-trigger')}
                    render={<Button size='sm' variant='ghost' />}
                    title='清单操作'
                    aria-label={`${list.title}清单操作`}
                  >
                    <MoreHorizontal aria-hidden='true' />
                  </PopoverPrimitive.Trigger>
                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Positioner
                      className={cx('tasks-list-actions-positioner')}
                      side='right'
                      align='center'
                      sideOffset={7}
                    >
                      <PopoverPrimitive.Popup className={cx('tasks-list-actions-popup')}>
                        <ToolbarPrimitive.Root
                          className={cx('tasks-list-actions')}
                          aria-label={`${list.title}清单操作`}
                          loopFocus
                        >
                          <ToolbarPrimitive.Button
                            className={cx('tasks-list-action-button')}
                            render={<Button size='sm' variant='ghost' />}
                            title='上移清单'
                            aria-label='上移清单'
                            disabled={index === 0}
                            onClick={() => {
                              setActiveListActionsID(null)
                              void moveList(list, -1)
                            }}
                          >
                            <ArrowUp aria-hidden='true' />
                          </ToolbarPrimitive.Button>
                          <ToolbarPrimitive.Button
                            className={cx('tasks-list-action-button')}
                            render={<Button size='sm' variant='ghost' />}
                            title='下移清单'
                            aria-label='下移清单'
                            disabled={index === workspace.lists.length - 1}
                            onClick={() => {
                              setActiveListActionsID(null)
                              void moveList(list, 1)
                            }}
                          >
                            <ArrowDown aria-hidden='true' />
                          </ToolbarPrimitive.Button>
                          <ToolbarPrimitive.Button
                            className={cx('tasks-list-action-button')}
                            render={<Button size='sm' variant='ghost' />}
                            title='编辑清单'
                            aria-label='编辑清单'
                            onClick={() => {
                              setActiveListActionsID(null)
                              openListDialog(list)
                            }}
                          >
                            <Pencil aria-hidden='true' />
                          </ToolbarPrimitive.Button>
                        </ToolbarPrimitive.Root>
                      </PopoverPrimitive.Popup>
                    </PopoverPrimitive.Positioner>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              </div>
            ))}
          </div>
        </aside>

        <main className={cx('tasks-main')}>
          <header className={cx('tasks-main-header')}>
            <div className={cx('tasks-main-title')}>
              <h2 className={cx('tasks-main-heading')}>{activeTitle}</h2>
              <span className={cx('tasks-main-summary')}>{pendingTasks.length} 项待完成</span>
            </div>
            <div className={cx('tasks-toolbar')}>
              <div className={cx('tasks-search')}>
                <Search className={cx('tasks-search-icon')} aria-hidden='true' />
                <Input
                  className={cx('tasks-search-input')}
                  id='tasks-search'
                  value={search}
                  placeholder='搜索任务'
                  aria-label='搜索任务'
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                className={cx('tasks-sort-select')}
                value={sortMode}
                options={sortOptions}
                aria-label='任务排序'
                onValueChange={(value) => setSortMode(value as SortMode)}
              />
            </div>
          </header>

          {selectedList !== 'starred' && (
            <form className={cx('tasks-quick-add')} onSubmit={(event) => void submitQuickTask(event)}>
              <Plus aria-hidden='true' />
              <Input
                value={quickTitle}
                maxLength={255}
                placeholder='添加任务，按 Enter 保存'
                aria-label='快速添加任务'
                onChange={(event) => setQuickTitle(event.target.value)}
              />
              <Button type='submit' disabled={working || !quickTitle.trim()}>
                添加
              </Button>
            </form>
          )}

          <div className={cx('tasks-scroll')}>
            {pendingTasks.length > 0 && (
              <div className={cx('tasks-items')}>{pendingTasks.map((task) => renderTask(task))}</div>
            )}
            {pendingTasks.length === 0 && (
              <ListState
                className={cx('tasks-empty')}
                loading={loading}
                loadingText='正在读取任务…'
                emptyText={loadError || (search.trim() ? '没有匹配的任务' : '这里已经清空了，添加一项新任务吧')}
                icon={<ClipboardCheck aria-hidden='true' />}
              />
            )}

            {completedTasks.length > 0 && (
              <section className={cx('tasks-completed')}>
                <div className={cx('tasks-completed-header')}>
                  <Button variant='ghost' onClick={() => setCompletedExpanded((value) => !value)}>
                    {completedExpanded ? <ChevronDown aria-hidden='true' /> : <ChevronRight aria-hidden='true' />}
                    已完成（{completedTasks.length}）
                  </Button>
                  {activeList && (
                    <Button size='sm' variant='ghost' onClick={() => void clearCompleted()}>
                      <Trash2 aria-hidden='true' />
                      全部删除
                    </Button>
                  )}
                </div>
                {completedExpanded && (
                  <div className={cx('tasks-items')}>{completedTasks.map((task) => renderTask(task))}</div>
                )}
              </section>
            )}
          </div>
        </main>
      </section>

      <TaskEditorDialog
        open={Boolean(editorTask)}
        task={editorTask}
        persistedTask={persistedEditorTask}
        lists={workspace.lists}
        parentTitle={parentTitle}
        saving={working}
        onOpenChange={(open) => {
          if (!open) {
            setEditorTask(null)
            setPersistedEditorTask(undefined)
          }
        }}
        onSave={persistTask}
        onDelete={removeTask}
      />

      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent size='sm'>
          <form onSubmit={(event) => void persistList(event)}>
            <DialogHeader>
              <DialogTitle>{listDraft.id ? '编辑清单' : '新建清单'}</DialogTitle>
              <DialogDescription>清单用于按项目或场景组织任务。</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Label className={cx('tasks-list-dialog-field')}>
                <span>清单名称</span>
                <Input
                  autoFocus
                  required
                  maxLength={120}
                  value={listDraft.title}
                  onChange={(event) => setListDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </Label>
            </DialogBody>
            <DialogFooter className={cx('tasks-list-dialog-footer')}>
              <div>
                {listDraft.id > 0 && (
                  <Button
                    type='button'
                    variant='danger'
                    disabled={workspace.lists.length <= 1}
                    onClick={() => {
                      const list = workspace.lists.find((item) => item.id === listDraft.id)
                      if (list) void removeList(list)
                    }}
                  >
                    删除清单
                  </Button>
                )}
              </div>
              <div className={cx('tasks-list-dialog-actions')}>
                <Button type='button' variant='outline' onClick={() => setListDialogOpen(false)}>
                  取消
                </Button>
                <Button type='submit' disabled={working || !listDraft.title.trim()}>
                  保存
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
