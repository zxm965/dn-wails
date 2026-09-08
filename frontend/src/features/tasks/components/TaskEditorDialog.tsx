import { CalendarClock, Flag, ListTodo, Repeat2, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

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
  Select,
  Switch,
  Textarea,
} from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import type { RepeatEndMode, RepeatFrequency, TaskInput, TaskItem, TaskList } from '../api/tasksApi'

import { styles } from './TaskEditorDialog.css'

const cx = createScopedClassNames(styles)

export interface TaskEditorDialogProps {
  open: boolean
  task: TaskInput | null
  persistedTask?: TaskItem
  lists: TaskList[]
  parentTitle?: string
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: TaskInput) => Promise<void>
  onDelete: (task: TaskItem, deleteSeries: boolean) => Promise<void>
}

const frequencyOptions = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
] as const

const endModeOptions = [
  { value: 'never', label: '永不结束' },
  { value: 'date', label: '在指定日期结束' },
  { value: 'count', label: '达到次数后结束' },
] as const

function toLocalDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toISOString(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function TaskEditorDialog({
  open,
  task,
  persistedTask,
  lists,
  parentTitle,
  saving,
  onOpenChange,
  onSave,
  onDelete,
}: TaskEditorDialogProps) {
  const [draft, setDraft] = useState<TaskInput | null>(task)
  const isSubtask = Boolean(draft?.parentId)
  const canMove = !persistedTask || persistedTask.repeat.frequency === 'none'
  const listOptions = useMemo(() => lists.map((list) => ({ value: list.id, label: list.title })), [lists])

  useEffect(() => {
    setDraft(task)
  }, [task])

  function update(patch: Partial<TaskInput>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function updateRepeat(patch: Partial<TaskInput['repeat']>) {
    setDraft((current) => (current ? { ...current, repeat: { ...current.repeat, ...patch } } : current))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || !draft.title.trim() || saving) return
    await onSave({
      ...draft,
      title: draft.title.trim(),
      scheduledAt: toISOString(draft.scheduledAt),
      deadlineAt: toISOString(draft.deadlineAt),
      repeat: isSubtask ? { frequency: 'none', interval: 1, endMode: 'never', endDate: '', count: 0 } : draft.repeat,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <form className={cx('task-editor-form')} onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>{persistedTask ? '编辑任务' : isSubtask ? '添加子任务' : '添加任务'}</DialogTitle>
            <DialogDescription>
              {parentTitle ? `属于「${parentTitle}」` : '设置任务详情、日期、截止时间和重复计划。'}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <DialogBody className={cx('task-editor-body')}>
              <Label className={cx('task-editor-field')}>
                <span>任务标题</span>
                <Input
                  autoFocus
                  required
                  maxLength={255}
                  value={draft.title}
                  placeholder='要完成什么？'
                  onChange={(event) => update({ title: event.target.value })}
                />
              </Label>

              <Label className={cx('task-editor-field')}>
                <span>详细信息</span>
                <Textarea
                  rows={4}
                  maxLength={100000}
                  value={draft.details}
                  placeholder='补充说明、链接或上下文'
                  onChange={(event) => update({ details: event.target.value })}
                />
              </Label>

              <div className={cx('task-editor-grid')}>
                <Label className={cx('task-editor-field')}>
                  <span className={cx('task-editor-label')}>
                    <ListTodo className={cx('task-editor-icon')} aria-hidden='true' />
                    任务清单
                  </span>
                  <Select
                    value={draft.listId}
                    options={listOptions}
                    disabled={isSubtask || !canMove}
                    aria-label='任务清单'
                    onValueChange={(listId) => update({ listId: Number(listId) })}
                  />
                </Label>

                <Label className={cx('task-editor-switch-field')}>
                  <span className={cx('task-editor-label')}>
                    <Star className={cx('task-editor-icon')} aria-hidden='true' />
                    加星标
                  </span>
                  <Switch checked={draft.starred} onCheckedChange={(starred) => update({ starred })} />
                </Label>

                <Label className={cx('task-editor-field')}>
                  <span className={cx('task-editor-label')}>
                    <CalendarClock className={cx('task-editor-icon')} aria-hidden='true' />
                    日期和时间
                  </span>
                  <Input
                    type='datetime-local'
                    value={toLocalDateTime(draft.scheduledAt)}
                    onChange={(event) => update({ scheduledAt: event.target.value })}
                  />
                </Label>

                <Label className={cx('task-editor-field')}>
                  <span className={cx('task-editor-label')}>
                    <Flag className={cx('task-editor-icon')} aria-hidden='true' />
                    截止时间
                  </span>
                  <Input
                    type='datetime-local'
                    value={toLocalDateTime(draft.deadlineAt)}
                    onChange={(event) => update({ deadlineAt: event.target.value })}
                  />
                </Label>
              </div>

              {!isSubtask && (
                <section className={cx('task-editor-repeat')}>
                  <div className={cx('task-editor-section-title')}>
                    <Repeat2 className={cx('task-editor-icon')} aria-hidden='true' />
                    重复
                  </div>
                  <div className={cx('task-editor-repeat-grid')}>
                    <Select
                      value={draft.repeat.frequency}
                      options={frequencyOptions}
                      aria-label='重复频率'
                      onValueChange={(frequency) => updateRepeat({ frequency: frequency as RepeatFrequency })}
                    />
                    {draft.repeat.frequency !== 'none' && (
                      <>
                        <Label className={cx('task-editor-compact-field')}>
                          <span>间隔</span>
                          <Input
                            type='number'
                            min={1}
                            max={999}
                            value={draft.repeat.interval}
                            onChange={(event) => updateRepeat({ interval: Number(event.target.value) || 1 })}
                          />
                        </Label>
                        <Select
                          value={draft.repeat.endMode}
                          options={endModeOptions}
                          aria-label='重复结束方式'
                          onValueChange={(endMode) => updateRepeat({ endMode: endMode as RepeatEndMode })}
                        />
                        {draft.repeat.endMode === 'date' && (
                          <Input
                            type='date'
                            aria-label='重复结束日期'
                            value={draft.repeat.endDate}
                            onChange={(event) => updateRepeat({ endDate: event.target.value })}
                          />
                        )}
                        {draft.repeat.endMode === 'count' && (
                          <Label className={cx('task-editor-compact-field')}>
                            <span>总次数</span>
                            <Input
                              type='number'
                              min={2}
                              max={9999}
                              value={draft.repeat.count || 2}
                              onChange={(event) => updateRepeat({ count: Number(event.target.value) || 2 })}
                            />
                          </Label>
                        )}
                      </>
                    )}
                  </div>
                  {draft.repeat.frequency !== 'none' && !draft.scheduledAt && !draft.deadlineAt && (
                    <small className={cx('task-editor-help')}>重复任务需要先设置日期时间或截止时间。</small>
                  )}
                </section>
              )}
            </DialogBody>
          )}

          <DialogFooter className={cx('task-editor-footer')}>
            <div>
              {persistedTask && (
                <Button
                  type='button'
                  variant='danger'
                  disabled={saving}
                  onClick={() => void onDelete(persistedTask, persistedTask.repeatSeriesId > 0)}
                >
                  <Trash2 aria-hidden='true' />
                  {persistedTask.repeatSeriesId > 0 ? '删除整个系列' : '删除任务'}
                </Button>
              )}
            </div>
            <div className={cx('task-editor-actions')}>
              <Button type='button' variant='outline' disabled={saving} onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                type='submit'
                disabled={
                  saving ||
                  !draft?.title.trim() ||
                  (draft.repeat.frequency !== 'none' && !draft.scheduledAt && !draft.deadlineAt)
                }
              >
                {saving ? '正在保存…' : '保存任务'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
