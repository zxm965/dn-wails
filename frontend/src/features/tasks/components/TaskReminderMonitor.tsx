import { useCallback, useEffect } from 'react'

import { useSystemNotification } from '@/features/system-notification'

import { claimDueTaskReminders } from '../api/tasksApi'

export function TaskReminderMonitor({ enabled, onOpenTasks }: { enabled: boolean; onOpenTasks: () => void }) {
  const handleActivated = useCallback(
    (activation: { conversationId?: string }) => {
      if (activation.conversationId?.startsWith('task:')) onOpenTasks()
    },
    [onOpenTasks],
  )
  const { capability, notifyMessage } = useSystemNotification({ onActivated: handleActivated })

  useEffect(() => {
    if (!enabled || capability !== 'ready') return
    let active = true
    let checking = false

    async function check() {
      if (checking) return
      checking = true
      try {
        const reminders = await claimDueTaskReminders()
        if (!active) return
        for (const task of reminders) {
          await notifyMessage({
            id: `task-${task.id}`,
            sender: '任务提醒',
            content: task.title,
            conversationId: `task:${task.id}`,
          })
        }
      } catch {
        // 数据库或系统通知暂不可用时保持静默，下次轮询继续尝试。
      } finally {
        checking = false
      }
    }

    void check()
    const timer = window.setInterval(() => void check(), 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [capability, enabled, notifyMessage])

  return null
}
