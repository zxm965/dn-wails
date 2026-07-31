import { Bell, CheckCheck, ExternalLink, MailCheck } from 'lucide-react'
import { useState } from 'react'

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ListState,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { getErrorMessage, type SiteMessage } from '../api/dnSystemApi'
import { useDnMessages } from '../context/DnMessageProvider'

import { classes as styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

export function DnMessageCenter() {
  const { notify } = useFeedback()
  const messages = useDnMessages()
  const [markingAll, setMarkingAll] = useState(false)

  async function markAll() {
    setMarkingAll(true)
    try {
      const count = await messages.markAll()
      notify({ title: count ? `已将 ${count} 条消息标记为已读` : '没有未读消息', tone: 'success' })
    } catch (error) {
      notify({ title: '全部已读失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <>
      <Button
        className={cx('dn-message-center-trigger')}
        size='sm'
        variant='ghost'
        type='button'
        aria-label='打开消息盒子'
        title='消息盒子'
        onClick={() => messages.setCenterOpen(true)}
      >
        <Bell aria-hidden='true' />
        {messages.unreadCount > 0 && (
          <span className={cx('dn-message-center-count')}>
            {messages.unreadCount > 99 ? '99+' : messages.unreadCount}
          </span>
        )}
      </Button>

      <Dialog open={messages.centerOpen} onOpenChange={messages.setCenterOpen}>
        <DialogContent size='sm'>
          <DialogHeader className={cx('dn-message-center-header')}>
            <div>
              <DialogTitle>消息盒子</DialogTitle>
              <DialogDescription>
                {messages.unreadCount ? `${messages.unreadCount} 条未读消息` : '暂无未读消息'}
              </DialogDescription>
            </div>
            {messages.unreadCount > 0 && (
              <Button variant='ghost' disabled={markingAll} onClick={() => void markAll()}>
                <CheckCheck aria-hidden='true' />
                全部已读
              </Button>
            )}
          </DialogHeader>
          <DialogBody className={cx('dn-message-center-body')}>
            {messages.inboxItems.length ? (
              <div className={cx('dn-message-center-list')}>
                {messages.inboxItems.map((message) => (
                  <Button
                    key={message.id}
                    className={cx('dn-message-center-item')}
                    size='lg'
                    variant='ghost'
                    title={message.content || message.title}
                    onClick={() => messages.openInboxMessage(message)}
                  >
                    <MessageLevelBadge message={message} />
                    <span>
                      <strong>{message.title}</strong>
                      <time>{formatMessageDate(message.publishedAt)}</time>
                    </span>
                    {message.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                  </Button>
                ))}
              </div>
            ) : (
              <ListState
                loading={messages.loading}
                emptyText='所有消息都已阅读'
                icon={<MailCheck aria-hidden='true' />}
              />
            )}
          </DialogBody>
          <DialogFooter className={cx('dn-message-center-footer')}>
            <span>
              {messages.lastSyncedAt
                ? `官网消息同步于 ${formatMessageDate(messages.lastSyncedAt)}`
                : '官网消息尚未同步'}
            </span>
            <Button variant='ghost' onClick={messages.showAllMessages}>
              查看全部消息
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={messages.popupOpen}
        onOpenChange={(open) => {
          if (!open && !messages.actionLoading) messages.dismissPopup()
        }}
      >
        <DialogContent size='sm'>
          <DialogHeader>
            <DialogTitle>{messages.activeMessage?.title || '站内消息'}</DialogTitle>
            <DialogDescription>
              {messages.activeMessage?.level === 'warning' ? '重要消息提醒' : '站内消息'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className={cx('dn-message-popup-content')}>
              {messages.activeMessage?.content || '你收到了一条新的站内消息。'}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant='outline' disabled={messages.actionLoading} onClick={messages.dismissPopup}>
              {messages.activeMessage?.actionUrl ? '稍后查看' : '关闭'}
            </Button>
            <Button disabled={messages.actionLoading} onClick={() => void messages.followActiveMessage()}>
              {messages.activeMessage?.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
              {messages.actionLoading
                ? '处理中…'
                : messages.activeMessage?.actionLabel || (messages.activeMessage?.actionUrl ? '查看详情' : '我知道了')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MessageLevelBadge({ message }: { message: SiteMessage }) {
  const meta = {
    info: { label: '信息', tone: 'info' as const },
    success: { label: '活动', tone: 'success' as const },
    warning: { label: '重要', tone: 'warning' as const },
    error: { label: '警告', tone: 'danger' as const },
  }[message.level]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

function formatMessageDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
