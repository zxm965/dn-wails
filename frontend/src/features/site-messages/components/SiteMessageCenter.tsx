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

import { getErrorMessage, type SiteMessage } from '../api/siteMessagesApi'
import { useSiteMessages } from '../context/SiteMessageProvider'

import { styles } from './SiteMessageCenter.css'

const cx = createScopedClassNames(styles)

export function SiteMessageCenter() {
  const { notify } = useFeedback()
  const messages = useSiteMessages()
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
        className={cx('site-message-center-trigger')}
        size='sm'
        variant='ghost'
        type='button'
        aria-label={messages.unreadCount ? `打开消息盒子，${messages.unreadCount} 条未读消息` : '打开消息盒子'}
        title='消息盒子'
        onClick={() => messages.setCenterOpen(true)}
      >
        <Bell className={cx('site-message-center-trigger-icon')} aria-hidden='true' />
        {messages.unreadCount > 0 && <span className={cx('site-message-center-indicator')} aria-hidden='true' />}
      </Button>

      <Dialog open={messages.centerOpen} onOpenChange={messages.setCenterOpen}>
        <DialogContent size='sm'>
          <DialogHeader className={cx('site-message-center-header')}>
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
          <DialogBody className={cx('site-message-center-body')}>
            {messages.inboxItems.length ? (
              <div className={cx('site-message-center-list')}>
                {messages.inboxItems.map((message) => (
                  <Button
                    key={message.id}
                    className={cx('site-message-center-item')}
                    size='lg'
                    variant='ghost'
                    title={message.content || message.title}
                    onClick={() => messages.openInboxMessage(message)}
                  >
                    <MessageLevelBadge message={message} />
                    <span className={cx('site-message-center-item-copy')}>
                      <strong className={cx('site-message-center-item-title')}>{message.title}</strong>
                      <time className={cx('site-message-center-item-time')}>
                        {formatMessageDate(message.publishedAt)}
                      </time>
                    </span>
                    {message.actionTarget === '_blank' && (
                      <ExternalLink className={cx('site-message-center-item-external')} aria-hidden='true' />
                    )}
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
          <DialogFooter className={cx('site-message-center-footer')}>
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
        <DialogContent size={messages.popupMessages.length > 1 ? 'lg' : 'full'} showCloseButton={false}>
          {messages.popupMessages.length > 1 ? (
            <>
              <DialogHeader className={cx('site-message-batch-header')}>
                <DialogTitle>{messages.popupMessages.length} 条新消息</DialogTitle>
                <DialogDescription>已为你合并展示，关闭后不会再逐条连续弹出。</DialogDescription>
              </DialogHeader>
              <DialogBody className={cx('site-message-batch-body')}>
                <div className={cx('site-message-batch-list')} role='list'>
                  {messages.popupMessages.map((message) => (
                    <article key={message.id} className={cx('site-message-batch-item')} role='listitem'>
                      <div className={cx('site-message-batch-item-header')}>
                        <MessageLevelBadge message={message} />
                        <time>{formatMessageDate(message.publishedAt)}</time>
                      </div>
                      <h3 className={cx('site-message-batch-item-title')}>{message.title}</h3>
                      <p className={cx('site-message-batch-item-content')}>
                        {message.content || '你收到了一条新的站内消息。'}
                      </p>
                      {message.actionUrl && (
                        <div className={cx('site-message-batch-item-actions')}>
                          <Button
                            className={cx('site-message-batch-action-button')}
                            variant='outline'
                            disabled={messages.actionLoading}
                            onClick={() => void messages.followPopupMessage(message)}
                          >
                            {message.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                            {messages.actionLoading ? '处理中…' : message.actionLabel || '查看详情'}
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </DialogBody>
              <DialogFooter className={cx('site-message-batch-footer')}>
                <span>共 {messages.popupMessages.length} 条新消息</span>
                <div className={cx('site-message-batch-footer-actions')}>
                  <Button
                    className={cx('site-message-batch-footer-button')}
                    variant='outline'
                    disabled={messages.actionLoading}
                    onClick={messages.dismissPopup}
                  >
                    关闭
                  </Button>
                  <Button
                    className={cx('site-message-batch-footer-button')}
                    disabled={messages.actionLoading}
                    onClick={() => {
                      messages.dismissPopup()
                      messages.showAllMessages()
                    }}
                  >
                    查看全部消息
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className={cx('site-message-popup-header')}>
                <DialogTitle className={cx('site-message-popup-title')}>
                  {messages.activeMessage?.title || '站内消息'}
                </DialogTitle>
                <DialogDescription>
                  {messages.activeMessage ? formatMessageDate(messages.activeMessage.publishedAt) : '站内消息'}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className={cx('site-message-popup-body')}>
                <span className={cx('site-message-popup-level')}>
                  {messages.activeMessage ? messageLevelLabel(messages.activeMessage.level) : '站内消息'}
                </span>
                <p className={cx('site-message-popup-content')}>
                  {messages.activeMessage?.content || '你收到了一条新的站内消息。'}
                </p>
              </DialogBody>
              <DialogFooter className={cx('site-message-popup-footer')}>
                <Button variant='outline' disabled={messages.actionLoading} onClick={messages.dismissPopup}>
                  {messages.activeMessage?.actionUrl ? '稍后查看' : '关闭'}
                </Button>
                {messages.activeMessage && (
                  <Button
                    disabled={messages.actionLoading}
                    onClick={() => {
                      if (messages.activeMessage) void messages.followPopupMessage(messages.activeMessage)
                    }}
                  >
                    {messages.activeMessage.actionTarget === '_blank' && <ExternalLink aria-hidden='true' />}
                    {messages.actionLoading
                      ? '处理中…'
                      : messages.activeMessage.actionLabel ||
                        (messages.activeMessage.actionUrl ? '查看详情' : '我知道了')}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
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

function messageLevelLabel(level: SiteMessage['level']): string {
  return {
    info: '信息通知',
    success: '活动通知',
    warning: '重要通知',
    error: '警告通知',
  }[level]
}

function formatMessageDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
