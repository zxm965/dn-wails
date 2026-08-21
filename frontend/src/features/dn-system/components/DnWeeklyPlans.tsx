import { Minus, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2 } from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
  Progress,
  Select,
  Slider,
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
} from '../api/dnSystemApi'
import {
  MANUAL_WEEKLY_COMMISSION_TOTAL,
  PROFESSION_OPTIONS,
  linkedCommissionRemaining,
  normalizeRemainingCommissionCount,
  priorityMeta,
  toggleLinkedCommissionCount,
  WEEKLY_COMMISSION_TOTAL,
  WEEKLY_FLAGS,
  type WeeklyFlagKey,
} from '../model/dnSystem'

import { styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

const emptyMeta: ListMeta = { total: 0, totalPages: 0, page: 1, pageSize: 20 }
const emptyFilters = { roleName: '', profession: '', roleProfessionId: 0 }

function inputFromPlan(plan: WeeklyPlan): WeeklyPlanInput {
  return {
    id: plan.id,
    roleProfessionId: plan.roleProfessionId,
    remainingCommissionCount: plan.remainingCommissionCount,
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
    setSaving(true)
    try {
      const updated = await saveWeeklyPlan(form)
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
      message: '将按照当前角色配置把剩余委托重置为 6，并清空侵蚀、方舟和噩梦状态，是否继续？',
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
        eyebrow='DN workspace'
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
          <span>请及时更新剩余委托数量，并核对侵蚀、方舟和噩梦状态。</span>
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
                options={[
                  { value: '', label: '全部' },
                  ...PROFESSION_OPTIONS.map((item) => ({ value: item.label, label: item.label })),
                ]}
                onValueChange={(profession) => setFilters((current) => ({ ...current, profession }))}
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
                  onRemainingCommissionChange={(remainingCommissionCount) =>
                    void quickUpdate(plan, { remainingCommissionCount })
                  }
                  onToggleFlag={(key) => {
                    const nextValue = !plan[key]
                    if (key === 'hasInvasion') {
                      void quickUpdate(plan, { hasInvasion: nextValue })
                      return
                    }
                    const remainingCommissionCount = toggleLinkedCommissionCount(
                      plan.remainingCommissionCount,
                      plan.hasArk,
                      plan.hasNightmare,
                      key,
                      nextValue,
                    )
                    void quickUpdate(plan, { [key]: nextValue, remainingCommissionCount })
                  }}
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
  onRemainingCommissionChange,
  onToggleFlag,
}: {
  plan: WeeklyPlan
  updating: boolean
  onEdit: () => void
  onDelete: () => void
  onRemainingCommissionChange: (count: number) => void
  onToggleFlag: (key: WeeklyFlagKey) => void
}) {
  const priority = priorityMeta(plan.priority)
  const remainingCommissionCount = normalizeRemainingCommissionCount(
    plan.remainingCommissionCount,
    plan.hasArk,
    plan.hasNightmare,
  )
  const manualRemaining = remainingCommissionCount - linkedCommissionRemaining(plan.hasArk, plan.hasNightmare)
  const completedCommissionCount = WEEKLY_COMMISSION_TOTAL - remainingCommissionCount
  const completedWeeklyCount = WEEKLY_FLAGS.filter((flag) => plan[flag.key]).length
  const roleInitial = Array.from(plan.roleName.trim())[0] ?? '?'

  return (
    <article className={cx(`dn-plan-card${updating ? ' is-updating' : ''}`)}>
      <header className={cx('dn-plan-card-header')}>
        <span className={cx('dn-plan-avatar')} aria-hidden='true'>
          {roleInitial}
        </span>
        <div className={cx('dn-plan-identity')}>
          <strong className={cx('dn-plan-role-name')}>{plan.roleName}</strong>
          <span className={cx('dn-plan-profession')}>{plan.profession || '未设置职业'}</span>
        </div>
        <Badge tone={priority.tone}>{priority.label}</Badge>
      </header>
      {plan.remark && <p className={cx('dn-plan-remark')}>{plan.remark}</p>}

      <section className={cx('dn-plan-commission-panel')}>
        <div className={cx('dn-plan-commission-heading')}>
          <div className={cx('dn-plan-commission-copy')}>
            <span className={cx('dn-plan-commission-label')}>剩余委托</span>
            <small className={cx('dn-plan-commission-meta')}>
              {completedCommissionCount}/{WEEKLY_COMMISSION_TOTAL} 已完成
            </small>
          </div>
          <strong className={cx('dn-plan-commission-count')}>
            {remainingCommissionCount}
            <small className={cx('dn-plan-commission-total')}>/{WEEKLY_COMMISSION_TOTAL}</small>
          </strong>
        </div>
        <Progress value={(completedCommissionCount / WEEKLY_COMMISSION_TOTAL) * 100} aria-label='委托完成进度' />
        <div className={cx('dn-plan-counter-actions')}>
          <Button
            size='sm'
            variant='outline'
            aria-label='增加剩余委托数量'
            disabled={updating || manualRemaining === MANUAL_WEEKLY_COMMISSION_TOTAL}
            onClick={() => onRemainingCommissionChange(remainingCommissionCount + 1)}
          >
            <Plus aria-hidden='true' />
          </Button>
          <span className={cx('dn-plan-counter-copy')}>
            {remainingCommissionCount === 0 ? '本周委托已完成' : `还剩 ${remainingCommissionCount} 个委托`}
          </span>
          <Button
            size='sm'
            variant='outline'
            aria-label='减少剩余委托数量'
            disabled={updating || manualRemaining === 0}
            onClick={() => onRemainingCommissionChange(remainingCommissionCount - 1)}
          >
            <Minus aria-hidden='true' />
          </Button>
        </div>
      </section>

      <section className={cx('dn-plan-weekly-section')}>
        <div className={cx('dn-plan-weekly-heading')}>
          <div className={cx('dn-plan-weekly-copy')}>
            <strong className={cx('dn-plan-weekly-title')}>周常状态</strong>
            <span className={cx('dn-plan-weekly-meta')}>侵蚀独立，方舟/噩梦计入委托</span>
          </div>
          <Badge tone={completedWeeklyCount === WEEKLY_FLAGS.length ? 'success' : 'outline'}>
            {completedWeeklyCount}/{WEEKLY_FLAGS.length}
          </Badge>
        </div>
        <div className={cx('dn-plan-flags')}>
          {WEEKLY_FLAGS.map((flag) => {
            const completed = plan[flag.key]
            return (
              <label key={flag.key} className={cx('dn-plan-flag')} data-completed={completed}>
                <span className={cx('dn-plan-flag-copy')}>
                  <strong className={cx('dn-plan-flag-title')}>{flag.label}</strong>
                  <small className={cx('dn-plan-flag-status')}>{completed ? '已完成' : '待完成'}</small>
                </span>
                <Switch
                  aria-label={`${flag.label}${completed ? '已完成' : '待完成'}`}
                  checked={completed}
                  disabled={updating}
                  onCheckedChange={() => onToggleFlag(flag.key)}
                />
              </label>
            )
          })}
        </div>
      </section>

      <footer className={cx('dn-plan-actions')}>
        <span className={cx('dn-plan-sort')}>排序 {plan.sortOrder}</span>
        <div className={cx('dn-plan-action-buttons')}>
          <Button size='sm' variant='secondary' onClick={onEdit}>
            <Pencil aria-hidden='true' />
            编辑
          </Button>
          <Button size='sm' variant='ghost' className={cx('dn-danger-action')} onClick={onDelete}>
            <Trash2 aria-hidden='true' />
            删除
          </Button>
        </div>
      </footer>
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

  function setRemainingCommissionCount(value: number) {
    if (!form) return
    update('remainingCommissionCount', normalizeRemainingCommissionCount(value, form.hasArk, form.hasNightmare))
  }

  function toggleFlag(key: WeeklyFlagKey, value: boolean) {
    if (!form) return
    if (key !== 'hasArk' && key !== 'hasNightmare') {
      update(key, value)
      return
    }
    onFormChange({
      ...form,
      [key]: value,
      remainingCommissionCount: toggleLinkedCommissionCount(
        form.remainingCommissionCount,
        form.hasArk,
        form.hasNightmare,
        key,
        value,
      ),
    })
  }

  const linkedRemaining = form ? linkedCommissionRemaining(form.hasArk, form.hasNightmare) : 0
  const remainingCommissionCount = form
    ? normalizeRemainingCommissionCount(form.remainingCommissionCount, form.hasArk, form.hasNightmare)
    : 0
  const manualRemaining = remainingCommissionCount - linkedRemaining

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent size='lg'>
        {form && (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>编辑周计划</DialogTitle>
              <DialogDescription>
                方舟和噩梦属于 6 个委托，会随完成状态自动计入；加减仅调整其他 4 个委托。
              </DialogDescription>
            </DialogHeader>
            <DialogBody className={cx('dn-plan-editor')}>
              <div className={cx('dn-form-grid')}>
                <Field label='角色职业'>
                  <Select
                    value={form.roleProfessionId}
                    options={roles.map((role) => ({
                      value: role.id,
                      label: `${role.roleName} / ${role.profession}`,
                    }))}
                    onValueChange={(roleProfessionId) => update('roleProfessionId', roleProfessionId)}
                  />
                </Field>
                <Field label='排序'>
                  <Input
                    type='number'
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) => update('sortOrder', Number(event.target.value || 0))}
                  />
                </Field>
              </div>

              <section>
                <div className={cx('dn-section-heading')}>
                  <strong>剩余委托</strong>
                  <span>
                    {remainingCommissionCount}/{WEEKLY_COMMISSION_TOTAL}
                  </span>
                </div>
                <div className={cx('dn-plan-count-editor')}>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    aria-label='增加剩余委托数量'
                    disabled={manualRemaining === MANUAL_WEEKLY_COMMISSION_TOTAL}
                    onClick={() => setRemainingCommissionCount(remainingCommissionCount + 1)}
                  >
                    <Plus aria-hidden='true' />
                  </Button>
                  <div className={cx('dn-plan-count-value')}>
                    <strong className={cx('dn-plan-count-number')}>{remainingCommissionCount}</strong>
                    <span className={cx('dn-plan-count-unit')}>个剩余</span>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    aria-label='减少剩余委托数量'
                    disabled={manualRemaining === 0}
                    onClick={() => setRemainingCommissionCount(remainingCommissionCount - 1)}
                  >
                    <Minus aria-hidden='true' />
                  </Button>
                </div>
                <Slider
                  aria-label='剩余委托数量'
                  min={linkedRemaining}
                  max={linkedRemaining + MANUAL_WEEKLY_COMMISSION_TOTAL}
                  step={1}
                  value={remainingCommissionCount}
                  onValueChange={setRemainingCommissionCount}
                />
                <div className={cx('dn-plan-count-scale')}>
                  <span>{linkedRemaining} · 方舟/噩梦按当前状态计入</span>
                  <span>{linkedRemaining + MANUAL_WEEKLY_COMMISSION_TOTAL} · 其他 4 个待完成</span>
                </div>
              </section>

              <section>
                <strong>周常状态</strong>
                <div className={cx('dn-editor-switches')}>
                  {WEEKLY_FLAGS.map((flag) => (
                    <label key={flag.key}>
                      <span>{flag.label}</span>
                      <Switch
                        aria-label={`${flag.label}完成状态`}
                        checked={form[flag.key]}
                        onCheckedChange={(value) => toggleFlag(flag.key, value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <label className={cx('dn-field')}>
                <Label>备注</Label>
                <Textarea value={form.remark} onChange={(event) => update('remark', event.target.value)} />
              </label>
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
