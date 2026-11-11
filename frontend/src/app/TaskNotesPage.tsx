import { useSearchParams } from 'react-router'

import { QuickNotesPanel } from '@/features/quick-notes'
import { TasksPanel } from '@/features/tasks'
import { PageTabs, type PageTab } from '@/shared/components/ui'

import { styles } from './TaskNotesPage.css'

type TaskNotesTab = 'tasks' | 'notes'

export function TaskNotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: TaskNotesTab = searchParams.get('tab') === 'notes' ? 'notes' : 'tasks'
  const tabs: readonly PageTab<TaskNotesTab>[] = [
    { value: 'tasks', label: '任务', description: '清单与待办计划', content: <TasksPanel /> },
    { value: 'notes', label: '笔记', description: '记录与云端保存', content: <QuickNotesPanel /> },
  ]

  function selectTab(tab: TaskNotesTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('tab', tab)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <PageTabs label='任务与笔记' tabs={tabs} value={activeTab} onValueChange={selectTab} />
    </div>
  )
}
