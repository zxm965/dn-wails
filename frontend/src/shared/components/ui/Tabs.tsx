import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './Tabs.css'

const cx = createScopedClassNames(styles)

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  const resolvedClassName: TabsPrimitive.Root.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-tabs', className(state)) : cx('ui-tabs', className)
  return <TabsPrimitive.Root className={resolvedClassName} {...props} />
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const resolvedClassName: TabsPrimitive.List.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-tabs-list', className(state)) : cx('ui-tabs-list', className)
  return <TabsPrimitive.List className={resolvedClassName} {...props} />
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const resolvedClassName: TabsPrimitive.Tab.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-tabs-trigger', className(state))
      : cx('ui-tabs-trigger', className)
  return <TabsPrimitive.Tab className={resolvedClassName} {...props} />
}

export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  const resolvedClassName: TabsPrimitive.Panel.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-tabs-content', className(state))
      : cx('ui-tabs-content', className)
  return <TabsPrimitive.Panel className={resolvedClassName} {...props} />
}
