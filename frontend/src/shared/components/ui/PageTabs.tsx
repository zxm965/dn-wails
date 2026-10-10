import { type ReactNode } from 'react'

import { Button } from './Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'

import { styles } from './PageTabs.css'

export interface PageTab<Value extends string> {
  value: Value
  label: string
  description: string
  content: ReactNode
}

interface PageTabsProps<Value extends string> {
  label: string
  tabs: readonly PageTab<Value>[]
  value: Value
  onValueChange: (value: Value) => void
}

export function PageTabs<Value extends string>({ label, tabs, value, onValueChange }: PageTabsProps<Value>) {
  return (
    <Tabs
      className={styles.root}
      value={value}
      onValueChange={(nextValue) => {
        const selected = tabs.find((tab) => tab.value === nextValue)
        if (selected) onValueChange(selected.value)
      }}
    >
      <TabsList className={styles.list} aria-label={label}>
        {tabs.map((tab, index) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={styles.trigger}
            title={`${tab.label} · ${tab.description}`}
            render={<Button size='md' variant='ghost' ripple={false} />}
          >
            <span className={styles.index} aria-hidden='true'>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className={styles.copy}>
              <strong className={styles.label}>{tab.label}</strong>
              <small className={styles.description}>{tab.description}</small>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className={styles.content}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
