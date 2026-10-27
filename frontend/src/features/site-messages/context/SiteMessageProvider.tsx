import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useAccount } from '@/features/account'
import { useFeedback } from '@/shared/feedback'
import { getErrorMessage } from '@/shared/lib/errorMessage'
import { openExternalURL } from '@/shared/native-kit'
import { getAppViewFromPath, type AppView } from '@/shared/navigation'

import {
  checkOfficialMessagesOnLogin,
  claimMessageNotifications,
  getMessageInbox,
  markAllMessagesRead,
  markMessageNotified,
  markMessageRead,
  type SiteMessage,
} from '../api/siteMessagesApi'

interface SiteMessageContextValue {
  inboxItems: SiteMessage[]
  unreadCount: number
  readRevision: number
  markRead: (message: SiteMessage) => Promise<SiteMessage>
  loading: boolean
  centerOpen: boolean
  activeMessage: SiteMessage | null
  popupMessages: SiteMessage[]
  popupOpen: boolean
  actionLoading: boolean
  lastSyncedAt: string
  setCenterOpen: (open: boolean) => void
  refreshInbox: () => Promise<void>
  openInboxMessage: (message: SiteMessage) => void
  showAllMessages: () => void
  markAll: () => Promise<number>
  dismissPopup: () => void
  followPopupMessage: (message: SiteMessage) => Promise<void>
}

const SiteMessageContext = createContext<SiteMessageContextValue | null>(null)

export function SiteMessageProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (target: AppView) => void
}) {
  const { notify } = useFeedback()
  const { user } = useAccount()
  const userId = user?.id ?? 0
  const [inboxItems, setInboxItems] = useState<SiteMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [readRevision, setReadRevision] = useState(0)
  const revision = useRef(0)
  const ownerRef = useRef(userId)
  ownerRef.current = userId
  const readRequests = useRef(new Map<number, Promise<SiteMessage>>())
  const readIds = useRef(new Set<number>())
  const [loading, setLoading] = useState(false)
  const [centerOpen, setCenterOpen] = useState(false)
  const [popupMessages, setPopupMessages] = useState<SiteMessage[]>([])
  const [popupOpen, setPopupOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const refreshPromise = useRef<Promise<void> | null>(null)
  const popupOpenRef = useRef(false)
  const lastSyncError = useRef('')
  const notificationAcknowledgements = useRef(new Map<number, Promise<void>>())
  const activeMessage = popupMessages.length === 1 ? popupMessages[0] : null

  useEffect(() => {
    popupOpenRef.current = popupOpen
  }, [popupOpen])

  const showMessages = useCallback((messages: SiteMessage[]) => {
    if (!messages.length) return
    setCenterOpen(false)
    setPopupMessages(messages)
    popupOpenRef.current = true
    setPopupOpen(true)
  }, [])

  const showMessage = useCallback((message: SiteMessage) => showMessages([message]), [showMessages])

  const acknowledgeMessage = useCallback((message: SiteMessage): Promise<void> => {
    if (!message.popup) return Promise.resolve()
    const existing = notificationAcknowledgements.current.get(message.id)
    if (existing) return existing
    const request = markMessageNotified(message.id).catch((error) => {
      notificationAcknowledgements.current.delete(message.id)
      throw error
    })
    notificationAcknowledgements.current.set(message.id, request)
    return request
  }, [])

  const claimPopup = useCallback(async () => {
    if (!userId || ownerRef.current !== userId || popupOpenRef.current) return
    try {
      const claimed = await claimMessageNotifications(20)
      if (ownerRef.current === userId) showMessages(claimed.items)
    } catch {
      // Inbox refresh remains available even when claiming a popup fails.
    }
  }, [showMessages, userId])

  useEffect(() => {
    if (!popupOpen) return
    void Promise.allSettled(
      popupMessages.filter((message) => message.popup).map((message) => acknowledgeMessage(message)),
    )
  }, [acknowledgeMessage, popupMessages, popupOpen])

  const refreshInbox = useCallback(async () => {
    if (!userId || ownerRef.current !== userId) return
    if (refreshPromise.current) return refreshPromise.current
    setLoading(true)
    const request = (async () => {
      try {
        let inbox
        while (ownerRef.current === userId) {
          const startedRevision = revision.current
          inbox = await getMessageInbox(8)
          if (ownerRef.current !== userId) return
          if (revision.current === startedRevision) break
        }
        if (!inbox || ownerRef.current !== userId) return
        setInboxItems(inbox.items)
        setUnreadCount(inbox.unreadCount)
        setLastSyncedAt(inbox.lastSyncedAt)
        if (inbox.syncError && inbox.syncError !== lastSyncError.current) {
          lastSyncError.current = inbox.syncError
          notify({ title: '官网消息同步暂时失败', message: inbox.syncError, tone: 'warning' })
        }
        if (!inbox.syncError) lastSyncError.current = ''
      } catch (error) {
        if (ownerRef.current !== userId) return
        notify({ title: '消息盒子加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        if (ownerRef.current === userId) {
          setLoading(false)
          refreshPromise.current = null
        }
      }
    })()
    refreshPromise.current = request
    return request
  }, [notify, userId])

  useEffect(() => {
    revision.current += 1
    refreshPromise.current = null
    readRequests.current.clear()
    readIds.current.clear()
    setLoading(false)
    setInboxItems([])
    setUnreadCount(0)
    setCenterOpen(false)
    setPopupMessages([])
    setPopupOpen(false)
    setLastSyncedAt('')
    lastSyncError.current = ''
    notificationAcknowledgements.current.clear()
    if (!userId) return

    void checkOfficialMessagesOnLogin()
      .catch((error) => {
        notify({ title: '官网消息同步暂时失败', message: getErrorMessage(error, '请稍后再试。'), tone: 'warning' })
      })
      .then(refreshInbox)
      .then(claimPopup)
    const timer = window.setInterval(() => void refreshInbox().then(claimPopup), 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [claimPopup, notify, refreshInbox, userId])

  useEffect(() => {
    if (centerOpen) void refreshInbox()
  }, [centerOpen, refreshInbox])

  const markRead = useCallback(
    (message: SiteMessage): Promise<SiteMessage> => {
      if (message.isRead || readIds.current.has(message.id)) return Promise.resolve({ ...message, isRead: true })
      const existing = readRequests.current.get(message.id)
      if (existing) return existing
      const request = markMessageRead(message.id)
        .then((updated) => {
          if (ownerRef.current !== userId) return updated
          readIds.current.add(message.id)
          revision.current += 1
          setReadRevision((value) => value + 1)
          setInboxItems((current) => current.filter((item) => item.id !== message.id))
          setUnreadCount((current) => Math.max(0, current - 1))
          void refreshInbox()
          return updated
        })
        .finally(() => {
          if (ownerRef.current === userId) readRequests.current.delete(message.id)
        })
      readRequests.current.set(message.id, request)
      return request
    },
    [userId, refreshInbox],
  )

  const markAll = useCallback(async () => {
    const count = await markAllMessagesRead()
    if (ownerRef.current !== userId) return count
    revision.current += 1
    setReadRevision((value) => value + 1)
    setInboxItems([])
    setUnreadCount(0)
    void refreshInbox()
    return count
  }, [userId, refreshInbox])

  const followMessage = useCallback(
    async (message: SiteMessage) => {
      const updated = await markRead(message)
      if (!updated.actionUrl) return
      const target = getAppViewFromPath(updated.actionUrl)
      if (target) {
        onNavigate(target)
        return
      }
      if (/^https?:\/\//i.test(updated.actionUrl)) {
        await openExternalURL(updated.actionUrl)
      } else {
        throw new Error('该消息指向的应用内页面不可用。')
      }
    },
    [markRead, onNavigate],
  )

  const openInboxMessage = useCallback(
    (message: SiteMessage) => {
      if (message.actionUrl) {
        setCenterOpen(false)
        void followMessage(message).catch((error) => {
          notify({ title: '消息处理失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
        })
        return
      }
      showMessage(message)
    },
    [followMessage, notify, showMessage],
  )

  const dismissPopup = useCallback(() => {
    const current = popupMessages
    popupOpenRef.current = false
    setPopupOpen(false)
    setPopupMessages([])
    for (const message of current) {
      void acknowledgeMessage(message).catch(() => {
        // A failed acknowledgement intentionally leaves the message claimable on a later refresh or login.
      })
    }
  }, [acknowledgeMessage, popupMessages])

  const showAllMessages = useCallback(() => {
    setCenterOpen(false)
    onNavigate('site-messages')
  }, [onNavigate])

  const followPopupMessage = useCallback(
    async (message: SiteMessage) => {
      setActionLoading(true)
      try {
        await followMessage(message)
        dismissPopup()
      } catch (error) {
        notify({ title: '消息处理失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setActionLoading(false)
      }
    },
    [dismissPopup, followMessage, notify],
  )

  const value = useMemo<SiteMessageContextValue>(
    () => ({
      inboxItems,
      unreadCount,
      readRevision,
      markRead,
      loading,
      centerOpen,
      activeMessage,
      popupMessages,
      popupOpen,
      actionLoading,
      lastSyncedAt,
      setCenterOpen,
      refreshInbox,
      openInboxMessage,
      showAllMessages,
      markAll,
      dismissPopup,
      followPopupMessage,
    }),
    [
      actionLoading,
      activeMessage,
      centerOpen,
      dismissPopup,
      followPopupMessage,
      inboxItems,
      lastSyncedAt,
      loading,
      markAll,
      markRead,
      readRevision,
      openInboxMessage,
      popupOpen,
      popupMessages,
      refreshInbox,
      showAllMessages,
      unreadCount,
    ],
  )

  return <SiteMessageContext.Provider value={value}>{children}</SiteMessageContext.Provider>
}

export function useSiteMessages(): SiteMessageContextValue {
  const value = useContext(SiteMessageContext)
  if (!value) throw new Error('useSiteMessages must be used inside SiteMessageProvider.')
  return value
}
