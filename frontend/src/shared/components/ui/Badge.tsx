import type { HTMLAttributes } from 'react'

import { classNames } from '@/shared/lib/classNames'

export type BadgeTone = 'accent' | 'neutral' | 'outline' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span data-ui='badge' className={classNames('ui-badge', `ui-badge-${tone}`, className)} {...props} />
}
