import { BellRing, Send, ShieldCheck } from 'lucide-react'
import { type FormEvent, useCallback, useMemo, useState } from 'react'

import { useSettings } from '@/features/settings'
import { Badge, Button, Input, Label, Textarea } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { type NotificationActivation, useSystemNotification } from '../hooks/useSystemNotification'

import { styles } from './SystemNotificationPanel.css'

const cx = createScopedClassNames(styles)

const DEMO_CONVERSATION_ID = 'system-notification-demo'
const DEFAULT_SENDER = '产品小助手'
const DEFAULT_CONTENT = '你收到一条新的项目消息，点击系统通知可以返回这个会话。'

interface SystemNotificationPanelProps {
  embedded?: boolean
}

export function SystemNotificationPanel({ embedded = false }: SystemNotificationPanelProps) {
  const { settings } = useSettings()
  const [sender, setSender] = useState(DEFAULT_SENDER)
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [feedback, setFeedback] = useState('填写消息内容后，发送一条原生系统通知。')
  const [formError, setFormError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  const handleActivated = useCallback((activation: NotificationActivation) => {
    if (activation.conversationId === DEMO_CONVERSATION_ID) {
      setFeedback('已通过系统通知返回当前会话。')
    }
  }, [])

  const { capability, error, requestPermission, notifyMessage } = useSystemNotification({
    onActivated: handleActivated,
  })

  const avatarText = useMemo(() => sender.trim().slice(0, 1) || '消', [sender])

  const notificationPolicyReady = settings.notifications.enabled && !settings.notifications.doNotDisturb

  const statusCopy = useMemo(() => {
    if (!settings.notifications.enabled) {
      return { label: '应用通知已关闭', className: 'is-warning' }
    }
    if (settings.notifications.doNotDisturb) {
      return { label: '免打扰已开启', className: 'is-warning' }
    }

    switch (capability) {
      case 'ready':
        return { label: '通知已开启', className: 'is-ready' }
      case 'permission-required':
        return { label: '需要通知权限', className: 'is-warning' }
      case 'unsupported':
        return { label: '当前系统不支持', className: 'is-error' }
      case 'error':
        return { label: '通知初始化失败', className: 'is-error' }
      default:
        return { label: '正在检测通知能力', className: 'is-loading' }
    }
  }, [capability, settings.notifications.doNotDisturb, settings.notifications.enabled])

  async function handlePermissionRequest() {
    setIsRequestingPermission(true)
    const authorized = await requestPermission()
    setFeedback(authorized ? '系统通知权限已开启。' : '未获得通知权限，请在系统设置中允许通知。')
    setIsRequestingPermission(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedSender = sender.trim()
    const normalizedContent = content.trim()
    if (!normalizedSender || !normalizedContent) {
      setFormError('发送者和消息内容不能为空。')
      return
    }
    if (capability !== 'ready') {
      setFormError('请先开启系统通知权限。')
      return
    }
    if (!settings.notifications.enabled) {
      setFormError('应用设置中已关闭系统通知。')
      return
    }
    if (settings.notifications.doNotDisturb) {
      setFormError('免打扰已开启，请先在设置中关闭。')
      return
    }

    setFormError('')
    setIsSending(true)

    try {
      await notifyMessage({
        sender: normalizedSender,
        content: normalizedContent,
        conversationId: DEMO_CONVERSATION_ID,
      })
      setFeedback('系统通知已发送，点击通知可唤醒应用并返回当前会话。')
    } catch {
      setFeedback('系统通知发送失败。')
    } finally {
      setIsSending(false)
    }
  }

  const visibleError = formError || error

  return (
    <section
      className={cx(`system-notification-panel${embedded ? ' is-embedded' : ''}`)}
      aria-labelledby='system-notification-title'
    >
      <div className={cx('system-notification-heading')}>
        <div className={cx('system-notification-heading-main')}>
          <span className={cx('system-notification-heading-icon')} aria-hidden='true'>
            <BellRing />
          </span>
          <div>
            <p className={cx('system-notification-eyebrow')}>System notification</p>
            {embedded ? (
              <h2 id='system-notification-title'>系统通知</h2>
            ) : (
              <h1 id='system-notification-title'>微信式消息通知</h1>
            )}
            <p className={cx('system-notification-description')}>检测权限、发送通知并验证点击唤醒。</p>
          </div>
        </div>
        <Badge className={cx(`notification-status ${statusCopy.className}`)}>
          <span className={cx('notification-status-dot')} aria-hidden='true' />
          {statusCopy.label}
        </Badge>
      </div>

      <div className={cx('notification-preview')} aria-label='系统通知实时预览'>
        <span className={cx('notification-preview-avatar')} aria-hidden='true'>
          {avatarText}
        </span>
        <div className={cx('notification-preview-copy')}>
          <span>Live preview</span>
          <strong>{sender.trim() || '未填写发送者'}</strong>
          <p>{content.trim() || '输入消息内容后在这里预览。'}</p>
        </div>
      </div>

      <form className={cx('notification-form')} onSubmit={handleSubmit}>
        <div className={cx('notification-composer')}>
          <div className={cx('notification-field notification-sender-row')}>
            <Label htmlFor='notification-sender'>发送者</Label>
            <Input
              id='notification-sender'
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              maxLength={60}
              disabled={isSending}
            />
          </div>

          <div className={cx('notification-field')}>
            <div className={cx('notification-field-heading')}>
              <Label htmlFor='notification-content'>消息内容</Label>
              <span className={cx('notification-field-counter')}>{content.length}/500</span>
            </div>
            <Textarea
              id='notification-content'
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={2}
              maxLength={500}
              disabled={isSending}
            />
          </div>
        </div>

        <div className={cx('notification-footer')}>
          <p
            className={cx(`notification-feedback${visibleError ? ' is-error' : ''}`)}
            role={visibleError ? 'alert' : 'status'}
          >
            {visibleError || feedback}
          </p>

          <div className={cx('notification-actions')}>
            {capability === 'permission-required' && settings.notifications.enabled && (
              <Button
                className={cx('notification-button notification-button-secondary')}
                type='button'
                variant='secondary'
                onClick={handlePermissionRequest}
                disabled={isRequestingPermission}
              >
                <ShieldCheck aria-hidden='true' />
                {isRequestingPermission ? '正在申请…' : '开启系统通知'}
              </Button>
            )}
            <Button
              className={cx('notification-button notification-button-primary')}
              type='submit'
              variant='primary'
              disabled={capability !== 'ready' || !notificationPolicyReady || isSending}
            >
              <Send aria-hidden='true' />
              {isSending ? '正在发送…' : '发送测试消息'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
