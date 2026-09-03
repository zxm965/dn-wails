import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'

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
  Select,
  SpinnerIcon,
  Textarea,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import {
  deleteRole,
  getErrorMessage,
  listRoles,
  saveRole,
  type ListMeta,
  type RoleProfession,
  type RoleProfessionInput,
} from '../api/dnSystemApi'
import { PRIORITY_OPTIONS, PROFESSION_OPTIONS, priorityMeta } from '../model/dnSystem'

import { styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

const emptyMeta: ListMeta = { total: 0, totalPages: 0, page: 1, pageSize: 15 }
const emptyFilters = { roleName: '', profession: '' }
const emptyForm: RoleProfessionInput = { id: 0, roleName: '', profession: '', priority: 0, remark: '', sortOrder: 0 }

export function DnRoles() {
  const { notify, confirm } = useFeedback()
  const [items, setItems] = useState<RoleProfession[]>([])
  const [meta, setMeta] = useState<ListMeta>(emptyMeta)
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<RoleProfessionInput>(emptyForm)

  const load = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const data = await listRoles({ ...appliedFilters, page, pageSize: 15 })
        setItems(data.items)
        setMeta(data.meta)
      } catch (error) {
        notify({ title: '角色加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [appliedFilters, notify],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  function openCreate() {
    setForm({ ...emptyForm })
    setEditorOpen(true)
  }

  function openEdit(item: RoleProfession) {
    setForm({
      id: item.id,
      roleName: item.roleName,
      profession: item.profession,
      priority: item.priority,
      remark: item.remark,
      sortOrder: item.sortOrder,
    })
    setEditorOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.roleName.trim() || !form.profession.trim()) {
      notify({ title: '角色名和职业不能为空', tone: 'warning' })
      return
    }
    setSaving(true)
    try {
      await saveRole(form)
      setEditorOpen(false)
      notify({ title: '角色已保存', tone: 'success' })
      await load(meta.page)
    } catch (error) {
      notify({ title: '角色保存失败', message: getErrorMessage(error, '请检查输入。'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: RoleProfession) {
    const accepted = await confirm({
      title: '删除角色',
      message: `确定删除「${item.roleName}」吗？关联周计划也会删除。`,
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!accepted) return
    setLoading(true)
    try {
      await deleteRole(item.id)
      notify({ title: '角色已删除', tone: 'success' })
      await load(meta.page)
    } catch (error) {
      notify({ title: '删除失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
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
        title='角色'
        subtitle='维护周计划所使用的角色和职业。'
        actions={
          <>
            <Button variant='outline' disabled={loading} onClick={() => void load(meta.page)}>
              <SpinnerIcon icon={RefreshCw} spinning={loading} aria-hidden='true' /> 刷新
            </Button>
            <Button onClick={openCreate}>
              <Plus aria-hidden='true' />
              新增角色
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className={cx('dn-filter-grid dn-role-filter-grid')}>
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
                  ...PROFESSION_OPTIONS.map((item) => ({
                    value: item.label,
                    label: `${item.label}（${item.group}）`,
                  })),
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
            <RoleTable items={items} onEdit={openEdit} onDelete={(item) => void remove(item)} />
          ) : (
            <ListState loading={loading} emptyText='暂无角色记录' />
          )}
        </CardContent>
        <CardFooter>
          <Pagination meta={meta} loading={loading} totalLabel='个角色' onPageChange={(page) => void load(page)} />
        </CardFooter>
      </Card>

      <Dialog open={editorOpen} onOpenChange={(open) => !saving && setEditorOpen(open)}>
        <DialogContent size='lg'>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{form.id ? '编辑角色' : '新增角色'}</DialogTitle>
              <DialogDescription>角色名在本地工作区内不能重复。</DialogDescription>
            </DialogHeader>
            <DialogBody className={cx('dn-form-grid')}>
              <Field label='角色名'>
                <Input
                  autoFocus
                  value={form.roleName}
                  onChange={(event) => setForm((current) => ({ ...current, roleName: event.target.value }))}
                />
              </Field>
              <Field label='职业'>
                <Select
                  value={form.profession}
                  options={[
                    { value: '', label: '请选择职业' },
                    ...PROFESSION_OPTIONS.map((item) => ({
                      value: item.label,
                      label: `${item.label}（${item.group}）`,
                    })),
                  ]}
                  onValueChange={(profession) => setForm((current) => ({ ...current, profession }))}
                />
              </Field>
              <Field label='角色权重'>
                <Select
                  value={form.priority}
                  options={PRIORITY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                  onValueChange={(priority) => setForm((current) => ({ ...current, priority }))}
                />
              </Field>
              <Field label='排序'>
                <Input
                  type='number'
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))
                  }
                />
              </Field>
              <Field label='备注' className={cx('dn-form-full')}>
                <Textarea
                  value={form.remark}
                  onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={saving} onClick={() => setEditorOpen(false)}>
                取消
              </Button>
              <Button type='submit' disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cx(`dn-field${className ? ` ${className}` : ''}`)}>
      <Label>{label}</Label>
      {children}
    </label>
  )
}

function RoleTable({
  items,
  onEdit,
  onDelete,
}: {
  items: RoleProfession[]
  onEdit: (item: RoleProfession) => void
  onDelete: (item: RoleProfession) => void
}) {
  return (
    <div className={cx('dn-table-wrap')}>
      <table className={cx('dn-table')}>
        <thead>
          <tr>
            <th>序号</th>
            <th>角色</th>
            <th>职业</th>
            <th>权重</th>
            <th>周计划</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.sortOrder}</td>
              <td>
                <strong>{item.roleName}</strong>
              </td>
              <td>{item.profession}</td>
              <td>
                <Badge tone={priorityMeta(item.priority).tone}>{priorityMeta(item.priority).label}</Badge>
              </td>
              <td>
                <Badge>{item.weeklyPlanCount} 条</Badge>
              </td>
              <td className={cx('dn-table-remark')}>{item.remark || '无备注'}</td>
              <td>
                <div className={cx('dn-row-actions')}>
                  <Button size='sm' variant='ghost' onClick={() => onEdit(item)}>
                    <Pencil aria-hidden='true' />
                    编辑
                  </Button>
                  <Button size='sm' variant='ghost' className={cx('dn-danger-action')} onClick={() => onDelete(item)}>
                    <Trash2 aria-hidden='true' />
                    删除
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
