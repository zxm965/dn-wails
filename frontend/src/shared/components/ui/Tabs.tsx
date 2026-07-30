import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { classNames } from '@/shared/lib/classNames'

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  const resolvedClassName: TabsPrimitive.Root.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-tabs', className(state))
      : classNames('ui-tabs', className)
  return <TabsPrimitive.Root className={resolvedClassName} {...props} />
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const resolvedClassName: TabsPrimitive.List.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-tabs-list', className(state))
      : classNames('ui-tabs-list', className)
  return <TabsPrimitive.List className={resolvedClassName} {...props} />
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const resolvedClassName: TabsPrimitive.Tab.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-tabs-trigger', className(state))
      : classNames('ui-tabs-trigger', className)
  return <TabsPrimitive.Tab className={resolvedClassName} {...props} />
}

export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  const resolvedClassName: TabsPrimitive.Panel.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-tabs-content', className(state))
      : classNames('ui-tabs-content', className)
  return <TabsPrimitive.Panel className={resolvedClassName} {...props} />
}
