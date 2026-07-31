import type { HTMLAttributes } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './Badge.css'

const cx = createScopedClassNames(styles)

export type BadgeTone = 'accent' | 'neutral' | 'outline' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span data-ui='badge' className={cx('ui-badge', `ui-badge-${tone}`, className)} {...props} />
}
