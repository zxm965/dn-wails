import { type CSSProperties, type ReactNode } from 'react'

import { Button } from './Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'

import { tabActionsWidthVar, styles } from './PageTabs.css'

export interface PageTab<Value extends string> {
  value: Value
  label: string
  description?: string
  content: ReactNode
  /** Extra content inside this tab, visible only while selected. */
  actions?: ReactNode
  /** Reserve space while actions are hidden or mounted through a portal. */
  actionsWidth?: string
}

interface PageTabsProps<Value extends string> {
  label: string
  actions?: ReactNode
  tabs: readonly PageTab<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

export function PageTabs<Value extends string>({ label, actions, tabs, value, onValueChange }: PageTabsProps<Value>) {
  const tabList = (
    <TabsList className={actions ? styles.actionList : styles.list} aria-label={label}>
      {tabs.map((tab, index) => (
        <div key={tab.value} className={styles.tab} data-active={tab.value === value ? '' : undefined}>
          <TabsTrigger
            value={tab.value}
            className={styles.trigger}
            title={tab.description ? `${tab.label} · ${tab.description}` : tab.label}
            render={<Button size='md' variant='ghost' ripple={false} />}
          >
            <span className={styles.index} aria-hidden='true'>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className={styles.copy}>
              <strong className={styles.label}>{tab.label}</strong>
              {tab.description && <small className={styles.description}>{tab.description}</small>}
            </span>
          </TabsTrigger>
          {(tab.actions != null || tab.actionsWidth !== undefined) && (
            <div
              className={styles.tabActions}
              style={{ [tabActionsWidthVar]: tab.actionsWidth } as CSSProperties}
              data-active={tab.value === value ? '' : undefined}
              aria-hidden={tab.value !== value}
              inert={tab.value !== value}
            >
              {tab.actions}
            </div>
          )}
        </div>
      ))}
    </TabsList>
  )
  return (
    <Tabs
      className={styles.root}
      value={value}
      onValueChange={(nextValue) => {
        const selected = tabs.find((tab) => tab.value === nextValue)
        if (selected) onValueChange(selected.value)
      }}
    >
      {actions ? (
        <div className={styles.toolbar}>
          {tabList}
          <div className={styles.actions}>{actions}</div>
        </div>
      ) : (
        tabList
      )}
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className={styles.content}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
