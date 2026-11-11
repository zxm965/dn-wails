import { useState } from 'react'

import { PageHeader, PageTabs, type PageTab } from '@/shared/components/ui'

import { EnhancedFontPanel } from './EnhancedFontPanel'
import { FontPatchPanel } from './FontPatchPanel'

import { styles } from './FontWorkshop.css'

type Mode = 'basic' | 'enhanced'
export function FontWorkshop() {
  const [mode, setMode] = useState<Mode>('basic')
  const [actionsContainer, setActionsContainer] = useState<HTMLDivElement | null>(null)
  const tabs: PageTab<Mode>[] = [
    { value: 'basic', label: '基础', content: <FontPatchPanel /> },
    {
      value: 'enhanced',
      label: '增强',
      actions: <div ref={setActionsContainer} className={styles.actions} />,
      // Two buttons: seven characters at most, plus padding, borders and gaps.
      actionsWidth: 'calc(7 * var(--font-size-caption) + 48px)',
      content: <EnhancedFontPanel actionsContainer={actionsContainer} />,
    },
  ]
  return (
    <div className={styles.page}>
      <PageHeader
        title='工坊'
        subtitle='一次只安装一个字体补丁；更换字体不等于统一调整界面字号，游戏内的加载与排版效果仍需实测。'
      />
      <PageTabs label='字体工坊模式' tabs={tabs} value={mode} onValueChange={setMode} />
    </div>
  )
}
