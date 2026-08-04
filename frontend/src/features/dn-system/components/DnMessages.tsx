import { CheckCheck, ExternalLink, Globe2, Info, MailCheck, Plus, Search, TriangleAlert } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'

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
  Switch,
  Textarea,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { openExternalURL } from '@/shared/native-kit'

import {
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
} from '../api/dnSystemApi'
import { useDnAuth } from '../context/DnAuthProvider'
import { useDnMessages } from '../context/DnMessageProvider'

import { styles } from './DnSystem.css'

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

export type DnInternalTarget = 'dashboard' | 'weekly' | 'roles' | 'messages' | 'account'

export function DnMessages({ onNavigate }: { onNavigate: (target: DnInternalTarget) => void }) {
  const { notify } = useFeedback()
  const { user } = useDnAuth()
  const messageCenter = useDnMessages()
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
  const [form, setForm] = useState<SiteMessageInput>({ ...emptyForm })

  const load = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const data = await listMessages({ ...appliedFilters, page, pageSize: 10 })
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
    [appliedFilters, notify],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  async function openMessage(message: SiteMessage) {
    let next = message
    if (!message.isRead) {
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
    const internalTargets: Record<string, DnInternalTarget> = {
      '/dashboard': 'dashboard',
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
    if (message.actionUrl) {
      try {
        await openExternalURL(message.actionUrl)
        setActiveMessage(null)
      } catch (error) {
        notify({ title: '打开链接失败', message: getErrorMessage(error, '链接不可用。'), tone: 'error' })
      }
    }
  }

  async function submitPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim()) {
      notify({ title: '消息标题不能为空', tone: 'warning' })
      return
    }
    setPublishing(true)
    try {
      await publishMessage({
        ...form,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
      })
      setForm({ ...emptyForm })
      setPublishOpen(false)
      notify({ title: '消息已发布', tone: 'success' })
      await load(1)
      await messageCenter.refreshInbox()
    } catch (error) {
      notify({ title: '消息发布失败', message: getErrorMessage(error, '请检查输入。'), tone: 'error' })
    } finally {
      setPublishing(false)
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
            {user?.role === 1 && (
              <>
                <Button variant='outline' disabled={syncing} onClick={() => void syncOfficial()}>
                  <SpinnerIcon icon={Globe2} spinning={syncing} aria-hidden='true' />
                  {syncing ? '同步中…' : '同步官网'}
                </Button>
                <Button onClick={() => setPublishOpen(true)}>
                  <Plus aria-hidden='true' />
                  发布消息
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className={cx('dn-message-filters')}>
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
                onChange={(event) =>
                  setFilters((current) => ({ ...current, readStatus: event.target.value as 'all' | 'read' | 'unread' }))
                }
              >
                <option value='all'>全部消息</option>
                <option value='unread'>仅未读</option>
                <option value='read'>仅已读</option>
              </Select>
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
            <div className={cx('dn-message-list')}>
              {items.map((message) => (
                <article
                  key={message.id}
                  className={cx(message.isRead ? 'dn-message-item' : 'dn-message-item is-unread')}
                >
                  <MessageIcon level={message.level} />
                  <span>
                    <span className={cx('dn-message-title')}>
                      {message.title}
                      {!message.isRead && <Badge tone='accent'>未读</Badge>}
                      <Badge tone='outline'>
                        {message.source === 'desktop'
                          ? '桌面'
                          : message.source === 'dragon-nest-official'
                            ? '游戏官网'
                            : message.source}
                      </Badge>
                    </span>
                    {message.content && <span className={cx('dn-message-content')}>{message.content}</span>}
                    <small>{formatDate(message.publishedAt)}</small>
                  </span>
                  <Button variant='ghost' onClick={() => void openMessage(message)}>
                    {message.actionLabel || (message.actionUrl ? '查看详情' : '查看消息')}
                    {message.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                  </Button>
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
            <p className={cx('dn-message-dialog-copy')}>{activeMessage?.content || '你收到了一条新的站内消息。'}</p>
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

      <Dialog open={publishOpen} onOpenChange={(open) => !publishing && setPublishOpen(open)}>
        <DialogContent size='lg'>
          <form onSubmit={submitPublish}>
            <DialogHeader>
              <DialogTitle>发布消息</DialogTitle>
              <DialogDescription>消息保存在当前桌面应用的本地工作区。</DialogDescription>
            </DialogHeader>
            <DialogBody className={cx('dn-form-grid')}>
              <label className={cx('dn-field')}>
                <Label>消息级别</Label>
                <Select
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, level: event.target.value as SiteMessageLevel }))
                  }
                >
                  <option value='info'>信息</option>
                  <option value='success'>成功</option>
                  <option value='warning'>警告</option>
                  <option value='error'>错误</option>
                </Select>
              </label>
              <label className={cx('dn-field')}>
                <Label>发布时间</Label>
                <Input
                  type='datetime-local'
                  value={form.publishedAt}
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
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field dn-form-full')}>
                <Label>内容</Label>
                <Textarea
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
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      actionTarget: event.target.value as '_self' | '_blank',
                    }))
                  }
                >
                  <option value='_self'>应用内处理</option>
                  <option value='_blank'>系统浏览器</option>
                </Select>
              </label>
              <label className={cx('dn-switch-row dn-form-full')}>
                <span>
                  <strong>作为弹窗提醒</strong>
                  <small>保留源项目的消息弹窗语义。</small>
                </span>
                <Switch
                  checked={form.popup}
                  onCheckedChange={(value) => setForm((current) => ({ ...current, popup: value }))}
                />
              </label>
            </DialogBody>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={publishing} onClick={() => setPublishOpen(false)}>
                取消
              </Button>
              <Button type='submit' disabled={publishing}>
                {publishing ? '发布中…' : '发布'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageIcon({ level }: { level: SiteMessageLevel }) {
  if (level === 'warning' || level === 'error')
    return (
      <span className={cx(`dn-message-icon is-${level}`)}>
        <TriangleAlert aria-hidden='true' />
      </span>
    )
  if (level === 'success')
    return (
      <span className={cx('dn-message-icon is-success')}>
        <MailCheck aria-hidden='true' />
      </span>
    )
  return (
    <span className={cx('dn-message-icon is-info')}>
      <Info aria-hidden='true' />
    </span>
  )
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
