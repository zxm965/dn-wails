import {
  CheckCheck,
  ExternalLink,
  Globe2,
  Info,
  MailCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { useAccount } from '@/features/account'
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
import { openExternalURL } from '@/shared/native-kit'

import {
  deleteMessage,
  getErrorMessage,
  listMessages,
  markAllMessagesRead,
  markMessageRead,
  publishMessage,
  syncOfficialMessages,
  type ListMeta,
  type SiteMessage,
  type SiteMessageInput,
  type SiteMessageLevel,
  updateMessage,
} from '../api/siteMessagesApi'
import { useSiteMessages } from '../context/SiteMessageProvider'

import { styles } from '../../dn-system/components/DnSystem.css'

const cx = createScopedClassNames(styles)

const emptyMeta: ListMeta = { total: 0, totalPages: 0, page: 1, pageSize: 10 }
const emptyForm: SiteMessageInput = {
  level: 'info',
  title: '',
  content: '',
  actionLabel: '',
  actionUrl: '',
  actionTarget: '_self',
  popup: true,
  publishedAt: '',
  expiresAt: '',
}

export type SiteMessageNavigationTarget = 'weekly' | 'roles' | 'messages' | 'account'

export function SiteMessages({ onNavigate }: { onNavigate: (target: SiteMessageNavigationTarget) => void }) {
  const { notify, confirm } = useFeedback()
  const { user } = useAccount()
  const isAdmin = user?.role === 1
  const messageCenter = useSiteMessages()
  const [items, setItems] = useState<SiteMessage[]>([])
  const [meta, setMeta] = useState<ListMeta>(emptyMeta)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filters, setFilters] = useState<{ keyword: string; readStatus: 'all' | 'read' | 'unread' }>({
    keyword: '',
    readStatus: 'all',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [loading, setLoading] = useState(true)
  const [activeMessage, setActiveMessage] = useState<SiteMessage | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editingMessage, setEditingMessage] = useState<SiteMessage | null>(null)
  const [form, setForm] = useState<SiteMessageInput>({ ...emptyForm })

  const load = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const data = await listMessages({ ...appliedFilters, page, pageSize: 10, manage: isAdmin })
        setItems(data.items)
        setMeta(data.meta)
        setUnreadCount(data.unreadCount)
        if (data.syncError) {
          notify({ title: '官网消息同步暂时失败', message: data.syncError, tone: 'warning' })
        }
      } catch (error) {
        notify({ title: '消息加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [appliedFilters, isAdmin, notify],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  async function openMessage(message: SiteMessage) {
    let next = message
    if (!message.isRead && isMessageCurrentlyActive(message)) {
      try {
        next = await markMessageRead(message.id)
        setItems((current) => current.map((item) => (item.id === message.id ? next : item)))
        setUnreadCount((current) => Math.max(0, current - 1))
        await messageCenter.refreshInbox()
      } catch (error) {
        notify({ title: '已读状态更新失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      }
    }
    setActiveMessage(next)
  }

  async function markAll() {
    setLoading(true)
    try {
      const count = await markAllMessagesRead()
      notify({ title: count ? `已将 ${count} 条消息标记为已读` : '当前没有未读消息', tone: 'success' })
      await load(meta.page)
      await messageCenter.refreshInbox()
    } catch (error) {
      notify({ title: '全部已读失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      setLoading(false)
    }
  }

  async function followAction(message: SiteMessage) {
    const internalTargets: Record<string, SiteMessageNavigationTarget> = {
      '/weekly-plans': 'weekly',
      '/roles': 'roles',
      '/messages': 'messages',
      '/account': 'account',
    }
    const target = internalTargets[message.actionUrl]
    if (target) {
      setActiveMessage(null)
      onNavigate(target)
      return
    }
    if (/^https?:\/\//i.test(message.actionUrl)) {
      try {
        await openExternalURL(message.actionUrl)
        setActiveMessage(null)
      } catch (error) {
        notify({ title: '打开链接失败', message: getErrorMessage(error, '链接不可用。'), tone: 'error' })
      }
      return
    }
    if (message.actionUrl.startsWith('/')) {
      notify({ title: '页面已不可用', message: '该消息指向的应用内页面已被移除。', tone: 'warning' })
    }
  }

  function openCreateMessage() {
    setEditingMessage(null)
    setForm({ ...emptyForm })
    setPublishOpen(true)
  }

  function openEditMessage(message: SiteMessage) {
    setEditingMessage(message)
    setForm({
      level: message.level,
      title: message.title,
      content: message.content,
      actionLabel: message.actionLabel,
      actionUrl: message.actionUrl,
      actionTarget: message.actionTarget,
      popup: true,
      publishedAt: formatDateTimeLocal(message.publishedAt),
      expiresAt: formatDateTimeLocal(message.expiresAt),
    })
    setPublishOpen(true)
  }

  async function submitPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      notify({ title: '消息标题和内容不能为空', tone: 'warning' })
      return
    }
    setPublishing(true)
    try {
      const input = {
        ...form,
        popup: true,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
      }
      if (editingMessage) {
        await updateMessage(editingMessage.id, input)
      } else {
        await publishMessage(input)
      }
      setForm({ ...emptyForm })
      setEditingMessage(null)
      setPublishOpen(false)
      notify({ title: editingMessage ? '消息已更新' : '消息已发布', tone: 'success' })
      await load(1)
      await messageCenter.refreshInbox()
    } catch (error) {
      notify({
        title: editingMessage ? '消息更新失败' : '消息发布失败',
        message: getErrorMessage(error, '请检查输入。'),
        tone: 'error',
      })
    } finally {
      setPublishing(false)
    }
  }

  async function removeMessage(message: SiteMessage) {
    const accepted = await confirm({
      title: '删除站内消息',
      message: `确定删除「${message.title}」吗？删除后所有用户都无法再看到该消息。`,
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!accepted) return
    setLoading(true)
    try {
      await deleteMessage(message.id)
      notify({ title: '消息已删除', tone: 'success' })
      await Promise.all([load(meta.page), messageCenter.refreshInbox()])
    } catch (error) {
      notify({ title: '消息删除失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      setLoading(false)
    }
  }

  async function syncOfficial() {
    setSyncing(true)
    try {
      const result = await syncOfficialMessages()
      notify({
        title: result.skipped ? '官网消息近期已同步' : `官网消息同步完成：新增 ${result.published} 条`,
        message: result.skipped ? '两次手动同步至少间隔 2 分钟。' : `本次获取 ${result.fetched} 条官网消息。`,
        tone: 'success',
      })
      await Promise.all([load(1), messageCenter.refreshInbox()])
    } catch (error) {
      notify({ title: '官网消息同步失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={cx('dn-page')}>
      <PageHeader
        eyebrow='DN workspace'
        title='站内消息'
        subtitle='查看桌面工作区公告与提醒。'
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant='outline' disabled={loading} onClick={() => void markAll()}>
                <CheckCheck aria-hidden='true' />
                全部已读
              </Button>
            )}
            {isAdmin && (
              <>
                <Button variant='outline' disabled={syncing} onClick={() => void syncOfficial()}>
                  <SpinnerIcon icon={Globe2} spinning={syncing} aria-hidden='true' />
                  {syncing ? '同步中…' : '同步官网数据'}
                </Button>
                <Button onClick={openCreateMessage}>
                  <Plus aria-hidden='true' />
                  创建站内信
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className={cx('site-message-filters')}>
            <label className={cx('dn-field')}>
              <Label>关键词</Label>
              <Input
                value={filters.keyword}
                placeholder='搜索标题或内容'
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && setAppliedFilters({ ...filters })}
              />
            </label>
            <label className={cx('dn-field')}>
              <Label>阅读状态</Label>
              <Select
                value={filters.readStatus}
                options={[
                  { value: 'all', label: '全部消息' },
                  { value: 'unread', label: '仅未读' },
                  { value: 'read', label: '仅已读' },
                ]}
                onValueChange={(readStatus) => setFilters((current) => ({ ...current, readStatus }))}
              />
            </label>
            <div className={cx('dn-filter-actions')}>
              <Button variant='secondary' disabled={loading} onClick={() => setAppliedFilters({ ...filters })}>
                <Search aria-hidden='true' />
                搜索
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  const next = { keyword: '', readStatus: 'all' as const }
                  setFilters(next)
                  setAppliedFilters(next)
                }}
              >
                重置
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <div className={cx('site-message-list')}>
              {items.map((message) => (
                <article
                  key={message.id}
                  className={cx(message.isRead ? 'site-message-item' : 'site-message-item is-unread')}
                >
                  <MessageIcon level={message.level} />
                  <span>
                    <span className={cx('site-message-title')}>
                      {message.title}
                      {!isAdmin && !message.isRead && <Badge tone='accent'>未读</Badge>}
                      {isAdmin && <MessageDeliveryBadge message={message} />}
                      <Badge tone='outline'>
                        {message.source === 'desktop'
                          ? '桌面'
                          : message.source === 'dragon-nest-official'
                            ? '游戏官网'
                            : message.source}
                      </Badge>
                    </span>
                    {message.content && <span className={cx('site-message-content')}>{message.content}</span>}
                    <small>{formatDate(message.publishedAt)}</small>
                  </span>
                  <div className={cx('site-message-actions')}>
                    <Button variant='ghost' onClick={() => void openMessage(message)}>
                      {message.actionLabel || (message.actionUrl ? '查看详情' : '查看消息')}
                      {message.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant='ghost'
                          title='编辑消息'
                          aria-label={`编辑 ${message.title}`}
                          onClick={() => openEditMessage(message)}
                        >
                          <Pencil aria-hidden='true' />
                        </Button>
                        <Button
                          className={cx('dn-danger-action')}
                          variant='ghost'
                          title='删除消息'
                          aria-label={`删除 ${message.title}`}
                          onClick={() => void removeMessage(message)}
                        >
                          <Trash2 aria-hidden='true' />
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ListState loading={loading} emptyText='没有符合条件的消息' icon={<MailCheck aria-hidden='true' />} />
          )}
        </CardContent>
        <CardFooter>
          <Pagination meta={meta} loading={loading} totalLabel='条消息' onPageChange={(page) => void load(page)} />
        </CardFooter>
      </Card>

      <Dialog open={Boolean(activeMessage)} onOpenChange={(open) => !open && setActiveMessage(null)}>
        <DialogContent size='sm'>
          <DialogHeader>
            <DialogTitle>{activeMessage?.title || '站内消息'}</DialogTitle>
            <DialogDescription>{activeMessage ? formatDate(activeMessage.publishedAt) : ''}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className={cx('site-message-dialog-copy')}>{activeMessage?.content || '你收到了一条新的站内消息。'}</p>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' onClick={() => setActiveMessage(null)}>
              关闭
            </Button>
            {activeMessage?.actionUrl && (
              <Button onClick={() => void followAction(activeMessage)}>
                {activeMessage.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                {activeMessage.actionLabel || '查看详情'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={publishOpen}
        onOpenChange={(open) => {
          if (publishing) return
          setPublishOpen(open)
          if (!open) setEditingMessage(null)
        }}
      >
        <DialogContent size='lg'>
          <form onSubmit={submitPublish}>
            <DialogHeader>
              <DialogTitle>{editingMessage ? '编辑站内信' : '创建站内信'}</DialogTitle>
              <DialogDescription>到达发送时间后，用户下次登录或消息刷新时会收到一次全屏提醒。</DialogDescription>
            </DialogHeader>
            <DialogBody className={cx('dn-form-grid')}>
              <label className={cx('dn-field')}>
                <Label>发送类型</Label>
                <Select
                  value={form.level}
                  options={[
                    { value: 'info', label: '信息' },
                    { value: 'success', label: '成功' },
                    { value: 'warning', label: '警告' },
                    { value: 'error', label: '错误' },
                  ]}
                  onValueChange={(level: SiteMessageLevel) => setForm((current) => ({ ...current, level }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>发布时间</Label>
                <Input
                  type='datetime-local'
                  value={form.publishedAt}
                  placeholder='留空立即发送'
                  onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>有效期至</Label>
                <Input
                  type='datetime-local'
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field dn-form-full')}>
                <Label>标题</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field dn-form-full')}>
                <Label>内容</Label>
                <Textarea
                  required
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>按钮文案</Label>
                <Input
                  value={form.actionLabel}
                  onChange={(event) => setForm((current) => ({ ...current, actionLabel: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>跳转地址</Label>
                <Input
                  value={form.actionUrl}
                  placeholder='/weekly-plans 或 https://…'
                  onChange={(event) => setForm((current) => ({ ...current, actionUrl: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>打开方式</Label>
                <Select
                  value={form.actionTarget}
                  options={[
                    { value: '_self', label: '应用内处理' },
                    { value: '_blank', label: '系统浏览器' },
                  ]}
                  onValueChange={(actionTarget) => setForm((current) => ({ ...current, actionTarget }))}
                />
              </label>
            </DialogBody>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={publishing}
                onClick={() => {
                  setPublishOpen(false)
                  setEditingMessage(null)
                }}
              >
                取消
              </Button>
              <Button type='submit' disabled={publishing}>
                {publishing ? '保存中…' : editingMessage ? '保存修改' : '发布站内信'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageDeliveryBadge({ message }: { message: SiteMessage }) {
  const now = Date.now()
  const publishedAt = new Date(message.publishedAt).getTime()
  const expiresAt = message.expiresAt ? new Date(message.expiresAt).getTime() : Number.NaN
  if (Number.isFinite(publishedAt) && publishedAt > now) return <Badge tone='info'>待发送</Badge>
  if (Number.isFinite(expiresAt) && expiresAt <= now) return <Badge tone='neutral'>已过期</Badge>
  return <Badge tone='success'>已发送</Badge>
}

function MessageIcon({ level }: { level: SiteMessageLevel }) {
  if (level === 'warning' || level === 'error')
    return (
      <span className={cx(`site-message-icon is-${level}`)}>
        <TriangleAlert aria-hidden='true' />
      </span>
    )
  if (level === 'success')
    return (
      <span className={cx('site-message-icon is-success')}>
        <MailCheck aria-hidden='true' />
      </span>
    )
  return (
    <span className={cx('site-message-icon is-info')}>
      <Info aria-hidden='true' />
    </span>
  )
}

function isMessageCurrentlyActive(message: SiteMessage): boolean {
  const now = Date.now()
  const publishedAt = new Date(message.publishedAt).getTime()
  if (Number.isFinite(publishedAt) && publishedAt > now) return false
  const expiresAt = message.expiresAt ? new Date(message.expiresAt).getTime() : Number.NaN
  return !Number.isFinite(expiresAt) || expiresAt > now
}

function formatDateTimeLocal(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)
}
