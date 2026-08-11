import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useAccount } from '@/features/account'
import { useFeedback } from '@/shared/feedback'
import { openExternalURL } from '@/shared/native-kit'

import {
  claimMessageNotifications,
  getErrorMessage,
  getMessageInbox,
  markAllMessagesRead,
  markMessageRead,
  type SiteMessage,
} from '../api/dnSystemApi'
import type { DnInternalTarget } from '../components/DnMessages'

interface DnMessageContextValue {
  inboxItems: SiteMessage[]
  unreadCount: number
  loading: boolean
  centerOpen: boolean
  activeMessage: SiteMessage | null
  popupOpen: boolean
  actionLoading: boolean
  lastSyncedAt: string
  setCenterOpen: (open: boolean) => void
  refreshInbox: () => Promise<void>
  openInboxMessage: (message: SiteMessage) => void
  showAllMessages: () => void
  markAll: () => Promise<number>
  dismissPopup: () => void
  followActiveMessage: () => Promise<void>
}

const DnMessageContext = createContext<DnMessageContextValue | null>(null)

const internalTargets: Record<string, DnInternalTarget> = {
  '/dashboard': 'dashboard',
  '/weekly-plans': 'weekly',
  '/roles': 'roles',
  '/messages': 'messages',
  '/account': 'account',
}

export function DnMessageProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (target: DnInternalTarget) => void
}) {
  const { notify } = useFeedback()
  const { user } = useAccount()
  const [inboxItems, setInboxItems] = useState<SiteMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [centerOpen, setCenterOpen] = useState(false)
  const [activeMessage, setActiveMessage] = useState<SiteMessage | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const refreshPromise = useRef<Promise<void> | null>(null)
  const popupOpenRef = useRef(false)
  const lastSyncError = useRef('')

  useEffect(() => {
    popupOpenRef.current = popupOpen
  }, [popupOpen])

  const showMessage = useCallback((message: SiteMessage) => {
    setCenterOpen(false)
    setActiveMessage(message)
    setPopupOpen(true)
  }, [])

  const claimPopup = useCallback(async () => {
    if (!user || popupOpenRef.current) return
    try {
      const claimed = await claimMessageNotifications(3)
      if (claimed.items[0]) showMessage(claimed.items[0])
    } catch {
      // Inbox refresh remains available even when claiming a popup fails.
    }
  }, [showMessage, user])

  const refreshInbox = useCallback(async () => {
    if (!user) return
    if (refreshPromise.current) return refreshPromise.current
    setLoading(true)
    const request = (async () => {
      try {
        const inbox = await getMessageInbox(8)
        setInboxItems(inbox.items)
        setUnreadCount(inbox.unreadCount)
        setLastSyncedAt(inbox.lastSyncedAt)
        if (inbox.syncError && inbox.syncError !== lastSyncError.current) {
          lastSyncError.current = inbox.syncError
          notify({ title: '官网消息同步暂时失败', message: inbox.syncError, tone: 'warning' })
        }
        if (!inbox.syncError) lastSyncError.current = ''
      } catch (error) {
        notify({ title: '消息盒子加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setLoading(false)
        refreshPromise.current = null
      }
    })()
    refreshPromise.current = request
    return request
  }, [notify, user])

  useEffect(() => {
    setInboxItems([])
    setUnreadCount(0)
    setCenterOpen(false)
    setActiveMessage(null)
    setPopupOpen(false)
    setLastSyncedAt('')
    lastSyncError.current = ''
    if (!user) return

    void refreshInbox().then(claimPopup)
    const timer = window.setInterval(() => void refreshInbox().then(claimPopup), 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [claimPopup, refreshInbox, user])

  useEffect(() => {
    if (centerOpen) void refreshInbox()
  }, [centerOpen, refreshInbox])

  const markRead = useCallback(async (message: SiteMessage) => {
    if (message.isRead) return message
    const updated = await markMessageRead(message.id)
    setInboxItems((current) => current.filter((item) => item.id !== message.id))
    setUnreadCount((current) => Math.max(0, current - 1))
    return updated
  }, [])

  const markAll = useCallback(async () => {
    const count = await markAllMessagesRead()
    setInboxItems([])
    setUnreadCount(0)
    return count
  }, [])

  const followMessage = useCallback(
    async (message: SiteMessage) => {
      const updated = await markRead(message)
      if (!updated.actionUrl) return
      if (updated.actionTarget === '_blank') {
        await openExternalURL(updated.actionUrl)
        return
      }
      const target = internalTargets[updated.actionUrl]
      if (target) {
        onNavigate(target)
        return
      }
      if (/^https?:\/\//i.test(updated.actionUrl)) await openExternalURL(updated.actionUrl)
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
    setPopupOpen(false)
    setActiveMessage(null)
  }, [])

  const showAllMessages = useCallback(() => {
    setCenterOpen(false)
    onNavigate('messages')
  }, [onNavigate])

  const followActiveMessage = useCallback(async () => {
    if (!activeMessage) return
    setActionLoading(true)
    try {
      await followMessage(activeMessage)
      dismissPopup()
    } catch (error) {
      notify({ title: '消息处理失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setActionLoading(false)
    }
  }, [activeMessage, dismissPopup, followMessage, notify])

  const value = useMemo<DnMessageContextValue>(
    () => ({
      inboxItems,
      unreadCount,
      loading,
      centerOpen,
      activeMessage,
      popupOpen,
      actionLoading,
      lastSyncedAt,
      setCenterOpen,
      refreshInbox,
      openInboxMessage,
      showAllMessages,
      markAll,
      dismissPopup,
      followActiveMessage,
    }),
    [
      actionLoading,
      activeMessage,
      centerOpen,
      dismissPopup,
      followActiveMessage,
      inboxItems,
      lastSyncedAt,
      loading,
      markAll,
      openInboxMessage,
      popupOpen,
      refreshInbox,
      showAllMessages,
      unreadCount,
    ],
  )

  return <DnMessageContext.Provider value={value}>{children}</DnMessageContext.Provider>
}

export function useDnMessages(): DnMessageContextValue {
  const value = useContext(DnMessageContext)
  if (!value) throw new Error('useDnMessages must be used inside DnMessageProvider.')
  return value
}
