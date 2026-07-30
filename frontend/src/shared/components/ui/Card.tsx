import type { HTMLAttributes } from 'react'

import { classNames } from '@/shared/lib/classNames'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section data-ui='card' className={classNames('ui-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-ui='card-header' className={classNames('ui-card-header', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-ui='card-title' className={classNames('ui-card-title', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-ui='card-description' className={classNames('ui-card-description', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-ui='card-content' className={classNames('ui-card-content', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer data-ui='card-footer' className={classNames('ui-card-footer', className)} {...props} />
}
