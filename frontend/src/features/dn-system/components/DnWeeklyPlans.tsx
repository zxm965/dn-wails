import { Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Checkbox,
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
  Pagination,
  Select,
  Switch,
  Textarea,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import {
  deleteWeeklyPlan,
  getErrorMessage,
  initializeWeeklyPlans,
  listRoleOptions,
  listWeeklyPlans,
  saveWeeklyPlan,
  syncWeeklyPlans,
  type ListMeta,
  type RoleProfession,
  type WeeklyPlan,
  type WeeklyPlanInput,
  type WeeklyPlanTicket,
} from '../api/dnSystemApi'
import {
  cloneCommissions,
  cloneTickets,
  getNestLabel,
  isValidTicketDate,
  NEST_OPTIONS,
  normalizeTicketDate,
  PRIORITY_OPTIONS,
  PROFESSION_OPTIONS,
  priorityMeta,
  WEEKLY_FLAGS,
  type WeeklyFlagKey,
} from '../model/dnSystem'

import { styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

const emptyMeta: ListMeta = { total: 0, totalPages: 0, page: 1, pageSize: 20 }
const emptyFilters = { roleName: '', profession: '', priority: -1, nestCommission: '', roleProfessionId: 0 }

function inputFromPlan(plan: WeeklyPlan): WeeklyPlanInput {
  return {
    id: plan.id,
    roleProfessionId: plan.roleProfessionId,
    nestCommissions: cloneCommissions(plan.nestCommissions),
    nestTickets: cloneTickets(plan.nestTickets),
    levelCommissionCount: plan.levelCommissionCount,
    hasInvasion: plan.hasInvasion,
    hasArk: plan.hasArk,
    hasNightmare: plan.hasNightmare,
    remark: plan.remark,
    sortOrder: plan.sortOrder,
  }
}

export function DnWeeklyPlans({ onNavigateRoles }: { onNavigateRoles: () => void }) {
  const { notify, confirm } = useFeedback()
  const [roles, setRoles] = useState<RoleProfession[]>([])
  const [items, setItems] = useState<WeeklyPlan[]>([])
  const [meta, setMeta] = useState<ListMeta>(emptyMeta)
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(() => new Set())
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<WeeklyPlanInput | null>(null)

  const loadRoles = useCallback(async () => {
    try {
      setRoles(await listRoleOptions())
    } catch (error) {
      notify({ title: '角色选项加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }, [notify])

  const loadPlans = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const data = await listWeeklyPlans({ ...appliedFilters, page, pageSize: 20 })
        setItems(data.items)
        setMeta(data.meta)
      } catch (error) {
        notify({ title: '周计划加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [appliedFilters, notify],
  )

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  useEffect(() => {
    void loadPlans(1)
  }, [loadPlans])

  const showWeeklyRefreshTip = useMemo(() => {
    const now = new Date()
    return (now.getDay() === 6 && now.getHours() >= 9) || (now.getDay() === 0 && now.getHours() < 9)
  }, [])

  async function quickUpdate(plan: WeeklyPlan, patch: Partial<WeeklyPlanInput>) {
    setUpdatingIds((current) => new Set(current).add(plan.id))
    try {
      const updated = await saveWeeklyPlan({ ...inputFromPlan(plan), ...patch })
      setItems((current) => current.map((item) => (item.id === plan.id ? updated : item)))
    } catch (error) {
      notify({ title: '状态更新失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current)
        next.delete(plan.id)
        return next
      })
    }
  }

  function openEditor(plan: WeeklyPlan) {
    setForm(inputFromPlan(plan))
    setEditorOpen(true)
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    if (!form.roleProfessionId) {
      notify({ title: '请选择角色职业', tone: 'warning' })
      return
    }
    for (const [index, ticket] of form.nestTickets.entries()) {
      if (!ticket.id || !isValidTicketDate(ticket.expiresAt)) {
        notify({ title: `第 ${index + 1} 张巢穴票填写不完整`, message: '日期格式示例：5-20。', tone: 'warning' })
        return
      }
    }
    setSaving(true)
    try {
      const updated = await saveWeeklyPlan({
        ...form,
        nestTickets: form.nestTickets.map((ticket) => ({
          ...ticket,
          expiresAt: normalizeTicketDate(ticket.expiresAt),
        })),
      })
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setEditorOpen(false)
      notify({ title: '周计划已保存', tone: 'success' })
    } catch (error) {
      notify({ title: '周计划保存失败', message: getErrorMessage(error, '请检查输入。'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(plan: WeeklyPlan) {
    const accepted = await confirm({
      title: '删除周计划',
      message: `确定删除「${plan.roleName}」的周计划吗？`,
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!accepted) return
    setLoading(true)
    try {
      await deleteWeeklyPlan(plan.id)
      notify({ title: '周计划已删除', tone: 'success' })
      await loadPlans(meta.page)
    } catch (error) {
      notify({ title: '删除失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      setLoading(false)
    }
  }

  async function syncRoles() {
    setLoading(true)
    try {
      const result = await syncWeeklyPlans()
      await Promise.all([loadRoles(), loadPlans(meta.page)])
      notify({
        title: result.created ? `已新增 ${result.created} 条周计划` : '角色和周计划已经同步',
        tone: 'success',
      })
    } catch (error) {
      notify({ title: '同步失败', message: getErrorMessage(error, '请先创建角色。'), tone: 'error' })
      setLoading(false)
    }
  }

  async function resetWeek() {
    const accepted = await confirm({
      title: '重置每周任务',
      message: '将按照当前角色配置清空巢穴委托、巢穴票和所有完成状态，是否继续？',
      confirmLabel: '确认重置',
      tone: 'danger',
    })
    if (!accepted) return
    setLoading(true)
    try {
      const result = await initializeWeeklyPlans()
      await loadPlans(meta.page)
      notify({ title: `每周任务已重置：新增 ${result.created} 条，刷新 ${result.updated} 条`, tone: 'success' })
    } catch (error) {
      notify({ title: '重置失败', message: getErrorMessage(error, '请先创建角色。'), tone: 'error' })
      setLoading(false)
    }
  }

  function applyFilters() {
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    setFilters({ ...emptyFilters })
    setAppliedFilters({ ...emptyFilters })
  }

  return (
    <div className={cx('dn-page')}>
      <PageHeader
        title='周计划'
        subtitle='按角色维护本周任务完成状态。'
        actions={
          <>
            <Button variant='outline' disabled={loading} onClick={() => void syncRoles()}>
              <RefreshCw aria-hidden='true' />
              同步角色
            </Button>
            <Button variant='outline' disabled={loading} onClick={() => void resetWeek()}>
              <Sparkles aria-hidden='true' />
              重置任务
            </Button>
          </>
        }
      />

      {showWeeklyRefreshTip && (
        <div className={cx('dn-alert dn-alert-warning')}>
          <strong>周任务已更新</strong>
          <span>请及时核对巢穴委托、巢穴票和每日疲劳状态。</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className={cx('dn-filter-grid dn-weekly-filter-grid')}>
            <Field label='角色'>
              <Input
                value={filters.roleName}
                placeholder='角色名'
                onChange={(event) => setFilters((current) => ({ ...current, roleName: event.target.value }))}
              />
            </Field>
            <Field label='职业'>
              <Select
                value={filters.profession}
                onChange={(event) => setFilters((current) => ({ ...current, profession: event.target.value }))}
              >
                <option value=''>全部</option>
                {PROFESSION_OPTIONS.map((item) => (
                  <option key={item.id} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label='角色权重'>
              <Select
                value={filters.priority}
                onChange={(event) => setFilters((current) => ({ ...current, priority: Number(event.target.value) }))}
              >
                <option value={-1}>全部</option>
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label='巢穴委托'>
              <Input
                value={filters.nestCommission}
                placeholder='模糊搜索'
                onChange={(event) => setFilters((current) => ({ ...current, nestCommission: event.target.value }))}
              />
            </Field>
            <div className={cx('dn-filter-actions')}>
              <Button variant='secondary' disabled={loading} onClick={applyFilters}>
                <Search aria-hidden='true' />
                搜索
              </Button>
              <Button variant='outline' onClick={resetFilters}>
                重置
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <div className={cx('dn-plan-grid')}>
              {items.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  updating={updatingIds.has(plan.id)}
                  onEdit={() => openEditor(plan)}
                  onDelete={() => void remove(plan)}
                  onToggleCommission={(id) =>
                    void quickUpdate(plan, {
                      nestCommissions: plan.nestCommissions.map((item) =>
                        item.id === id ? { ...item, completed: !item.completed } : item,
                      ),
                    })
                  }
                  onDeleteTicket={(index) =>
                    void quickUpdate(plan, {
                      nestTickets: plan.nestTickets.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                  onToggleDaily={() =>
                    void quickUpdate(plan, { levelCommissionCount: plan.levelCommissionCount > 0 ? 0 : 1 })
                  }
                  onToggleFlag={(key) => void quickUpdate(plan, { [key]: !plan[key] })}
                />
              ))}
            </div>
          ) : (
            <ListState loading={loading} emptyText={roles.length ? '暂无周计划记录' : '请先创建角色，再同步周计划'} />
          )}
          {!loading && !roles.length && (
            <div className={cx('dn-empty-action')}>
              <Button variant='outline' onClick={onNavigateRoles}>
                前往创建角色
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Pagination meta={meta} loading={loading} totalLabel='条计划' onPageChange={(page) => void loadPlans(page)} />
        </CardFooter>
      </Card>

      <PlanEditor
        open={editorOpen}
        saving={saving}
        roles={roles}
        form={form}
        onOpenChange={setEditorOpen}
        onFormChange={setForm}
        onSubmit={submitEditor}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={cx('dn-field')}>
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function PlanCard({
  plan,
  updating,
  onEdit,
  onDelete,
  onToggleCommission,
  onDeleteTicket,
  onToggleDaily,
  onToggleFlag,
}: {
  plan: WeeklyPlan
  updating: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleCommission: (id: number) => void
  onDeleteTicket: (index: number) => void
  onToggleDaily: () => void
  onToggleFlag: (key: WeeklyFlagKey) => void
}) {
  const priority = priorityMeta(plan.priority)
  return (
    <article className={cx(`dn-plan-card${updating ? ' is-updating' : ''}`)}>
      <div className={cx('dn-card-heading-row')}>
        <div>
          <strong>{plan.roleName}</strong>
          <span>{plan.profession || '未设置职业'}</span>
        </div>
        <Badge tone={priority.tone}>{priority.label}</Badge>
      </div>
      {plan.remark && <p className={cx('dn-plan-remark')}>{plan.remark}</p>}

      <section className={cx('dn-plan-section')}>
        <div className={cx('dn-section-heading')}>
          <span>巢穴委托</span>
          <Button size='sm' variant='ghost' aria-label='编辑巢穴委托' onClick={onEdit}>
            <Pencil aria-hidden='true' />
          </Button>
        </div>
        <div className={cx('dn-status-grid')}>
          {plan.nestCommissions.map((item) => (
            <Button
              key={item.id}
              size='sm'
              variant='outline'
              className={cx(item.completed ? 'dn-status-toggle is-selected' : 'dn-status-toggle')}
              aria-pressed={item.completed}
              disabled={updating}
              onClick={() => onToggleCommission(item.id)}
            >
              {getNestLabel(item.id)}
            </Button>
          ))}
          {!plan.nestCommissions.length && <span className={cx('dn-muted')}>暂无</span>}
        </div>
      </section>

      <section className={cx('dn-plan-section')}>
        <div className={cx('dn-section-heading')}>
          <span>巢穴票</span>
          <Button size='sm' variant='ghost' aria-label='编辑巢穴票' onClick={onEdit}>
            <Pencil aria-hidden='true' />
          </Button>
        </div>
        <div className={cx('dn-ticket-chips')}>
          {plan.nestTickets.map((ticket, index) => (
            <span key={`${ticket.id}-${ticket.expiresAt}-${index}`}>
              <Badge>
                {getNestLabel(ticket.id)} · {ticket.expiresAt}
              </Badge>
              <Button
                size='sm'
                variant='ghost'
                aria-label='删除巢穴票'
                disabled={updating}
                onClick={() => onDeleteTicket(index)}
              >
                <X aria-hidden='true' />
              </Button>
            </span>
          ))}
          {!plan.nestTickets.length && <span className={cx('dn-muted')}>暂无</span>}
        </div>
      </section>

      <div className={cx('dn-plan-flags')}>
        <label>
          <span>每日疲劳</span>
          <Switch checked={plan.levelCommissionCount > 0} disabled={updating} onCheckedChange={onToggleDaily} />
        </label>
        {WEEKLY_FLAGS.map((flag) => (
          <label key={flag.key}>
            <span>{flag.label}</span>
            <Switch checked={plan[flag.key]} disabled={updating} onCheckedChange={() => onToggleFlag(flag.key)} />
          </label>
        ))}
      </div>

      <div className={cx('dn-row-actions')}>
        <Button size='sm' variant='ghost' onClick={onEdit}>
          <Pencil aria-hidden='true' />
          编辑
        </Button>
        <Button size='sm' variant='ghost' className={cx('dn-danger-action')} onClick={onDelete}>
          <Trash2 aria-hidden='true' />
          删除
        </Button>
      </div>
    </article>
  )
}

function PlanEditor({
  open,
  saving,
  roles,
  form,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean
  saving: boolean
  roles: RoleProfession[]
  form: WeeklyPlanInput | null
  onOpenChange: (open: boolean) => void
  onFormChange: (form: WeeklyPlanInput | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  function update<Key extends keyof WeeklyPlanInput>(key: Key, value: WeeklyPlanInput[Key]) {
    if (form) onFormChange({ ...form, [key]: value })
  }

  function toggleCommission(id: number, checked: boolean) {
    if (!form) return
    const exists = form.nestCommissions.some((item) => item.id === id)
    if (!checked) {
      update(
        'nestCommissions',
        form.nestCommissions.filter((item) => item.id !== id),
      )
    } else if (!exists && form.nestCommissions.length < 6) {
      update('nestCommissions', [...form.nestCommissions, { id, completed: false }])
    }
  }

  function updateTicket(index: number, patch: Partial<WeeklyPlanTicket>) {
    if (!form) return
    update(
      'nestTickets',
      form.nestTickets.map((ticket, ticketIndex) => (ticketIndex === index ? { ...ticket, ...patch } : ticket)),
    )
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent size='lg'>
        {form && (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>编辑周计划</DialogTitle>
              <DialogDescription>更新角色关联、巢穴任务、票券和完成状态。</DialogDescription>
            </DialogHeader>
            <DialogBody className={cx('dn-plan-editor')}>
              <div className={cx('dn-form-grid')}>
                <Field label='角色职业'>
                  <Select
                    value={form.roleProfessionId}
                    onChange={(event) => update('roleProfessionId', Number(event.target.value))}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.roleName} / {role.profession}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label='排序'>
                  <Input
                    type='number'
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) => update('sortOrder', Number(event.target.value || 0))}
                  />
                </Field>
                <label className={cx('dn-field dn-form-full')}>
                  <Label>备注</Label>
                  <Textarea value={form.remark} onChange={(event) => update('remark', event.target.value)} />
                </label>
              </div>

              <section>
                <div className={cx('dn-section-heading')}>
                  <strong>巢穴委托</strong>
                  <span>{form.nestCommissions.length}/6</span>
                </div>
                <div className={cx('dn-nest-picker')}>
                  {NEST_OPTIONS.map((nest) => {
                    const checked = form.nestCommissions.some((item) => item.id === nest.id)
                    const disabled = !checked && form.nestCommissions.length >= 6
                    return (
                      <label key={nest.id} className={cx(checked ? 'is-selected' : undefined)}>
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(value) => toggleCommission(nest.id, value)}
                        />
                        {nest.label}
                      </label>
                    )
                  })}
                </div>
              </section>

              <section>
                <div className={cx('dn-section-heading')}>
                  <strong>巢穴票</strong>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => update('nestTickets', [...form.nestTickets, { id: 1, expiresAt: '' }])}
                  >
                    <Plus aria-hidden='true' />
                    新增
                  </Button>
                </div>
                <div className={cx('dn-ticket-editor')}>
                  {form.nestTickets.map((ticket, index) => (
                    <div key={index}>
                      <Select
                        value={ticket.id}
                        onChange={(event) => updateTicket(index, { id: Number(event.target.value) })}
                      >
                        {NEST_OPTIONS.map((nest) => (
                          <option key={nest.id} value={nest.id}>
                            {nest.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={ticket.expiresAt}
                        placeholder='5-20'
                        onChange={(event) => updateTicket(index, { expiresAt: event.target.value })}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        className={cx('dn-danger-action')}
                        onClick={() =>
                          update(
                            'nestTickets',
                            form.nestTickets.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 aria-hidden='true' />
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <strong>完成状态</strong>
                <div className={cx('dn-editor-switches')}>
                  <label>
                    <span>每日疲劳</span>
                    <Switch
                      checked={form.levelCommissionCount > 0}
                      onCheckedChange={(value) => update('levelCommissionCount', value ? 1 : 0)}
                    />
                  </label>
                  {WEEKLY_FLAGS.map((flag) => (
                    <label key={flag.key}>
                      <span>{flag.label}</span>
                      <Switch checked={form[flag.key]} onCheckedChange={(value) => update(flag.key, value)} />
                    </label>
                  ))}
                </div>
              </section>
            </DialogBody>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={saving} onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type='submit' disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
