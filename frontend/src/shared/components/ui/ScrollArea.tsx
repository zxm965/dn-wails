import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import type { Ref } from 'react'

import { classNames } from '@/shared/lib/classNames'

import { styles } from './ScrollArea.css'

interface ScrollAreaProps extends Omit<ScrollAreaPrimitive.Root.Props, 'className'> {
  className?: string
  viewportClassName?: string
  viewportRef?: Ref<HTMLDivElement>
}

export function ScrollArea({ children, className, viewportClassName, viewportRef, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root {...props} className={classNames(styles.root, className)}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={classNames(styles.viewport, viewportClassName)}
        style={{ overflowX: 'hidden' }}
      >
        <ScrollAreaPrimitive.Content className={styles.content} style={{ minWidth: 0 }}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className={styles.scrollbar}>
        <ScrollAreaPrimitive.Thumb className={styles.thumb} />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}
