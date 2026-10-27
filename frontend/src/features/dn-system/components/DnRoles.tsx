import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useEffectEvent, useState } from 'react'

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
  ListState,
  PageHeader,
  Pagination,
  Select,
  SpinnerIcon,
  Textarea,
} from '@/shared/components/ui'
import { QueryFeedback } from '@/shared/components/ui/QueryFeedback'
import { useFeedback } from '@/shared/feedback'
import { useRequestGuard } from '@/shared/hooks/useRequestGuard'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { getErrorMessage } from '@/shared/lib/errorMessage'

import {
  deleteRole,
  listRoles,
  saveRole,
  type ListMeta,
  type RoleProfession,
  type RoleProfessionInput,
} from '../api/dnSystemApi'
import { PRIORITY_OPTIONS, PROFESSION_OPTIONS, priorityMeta } from '../model/dnSystem'
import { DnField } from './DnField'
import { DnFilterBar } from './DnFilterBar'

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
  const [loadError, setLoadError] = useState('')
  const [requestedPage, setRequestedPage] = useState(1)
  const beginRequest = useRequestGuard()
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<RoleProfessionInput>(emptyForm)

  const load = async (page: number) => {
    const isCurrent = beginRequest()
    setRequestedPage(page)
    setLoadError('')
    setLoading(true)
    try {
      const data = await listRoles({ ...appliedFilters, page, pageSize: 15 })
      if (!isCurrent()) return
      setItems(data.items)
      setMeta(data.meta)
    } catch (error) {
      if (isCurrent()) setLoadError(getErrorMessage(error, '角色加载失败，请重试。'))
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }

  const onFiltersChanged = useEffectEvent(load)
  useEffect(() => {
    void onFiltersChanged(1)
  }, [appliedFilters])

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
          <DnFilterBar
            filters={filters}
            variant='roles'
            loading={loading}
            onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
            onSearch={applyFilters}
            onReset={resetFilters}
          />
        </CardHeader>
        <CardContent>
          <QueryFeedback
            layout='table'
            loading={loading}
            error={loadError}
            hasData={items.length > 0}
            onRetry={() => void load(requestedPage)}
          />
          {items.length ? (
            <RoleTable items={items} onEdit={openEdit} onDelete={(item) => void remove(item)} />
          ) : !loading && !loadError ? (
            <ListState loading={loading} emptyText='暂无角色记录' />
          ) : null}
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
              <DnField label='角色名'>
                <Input
                  autoFocus
                  value={form.roleName}
                  onChange={(event) => setForm((current) => ({ ...current, roleName: event.target.value }))}
                />
              </DnField>
              <DnField label='职业'>
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
              </DnField>
              <DnField label='角色权重'>
                <Select
                  value={form.priority}
                  options={PRIORITY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                  onValueChange={(priority) => setForm((current) => ({ ...current, priority }))}
                />
              </DnField>
              <DnField label='排序'>
                <Input
                  type='number'
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))
                  }
                />
              </DnField>
              <DnField label='备注' className={cx('dn-form-full')}>
                <Textarea
                  value={form.remark}
                  onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
                />
              </DnField>
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
