import type { HTMLAttributes } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './Card.css'

const cx = createScopedClassNames(styles)

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section data-ui='card' className={cx('ui-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-ui='card-header' className={cx('ui-card-header', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-ui='card-title' className={cx('ui-card-title', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-ui='card-description' className={cx('ui-card-description', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-ui='card-content' className={cx('ui-card-content', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer data-ui='card-footer' className={cx('ui-card-footer', className)} {...props} />
}
