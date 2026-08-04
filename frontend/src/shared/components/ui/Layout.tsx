import type { HTMLAttributes, ReactNode } from 'react'

import { classNames, createScopedClassNames } from '@/shared/lib/classNames'

import { Button } from './Button'
import { SpinnerIcon } from './Spinner'

import { styles } from './Layout.css'

const cx = createScopedClassNames(styles)

export interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={classNames(cx('ui-page-header'), className)}>
      <div>
        {eyebrow && <span className={cx('ui-page-header-eyebrow')}>{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className={cx('ui-page-header-actions')}>{actions}</div>}
    </header>
  )
}

export interface PaginationMeta {
  total: number
  totalPages: number
  page: number
  pageSize: number
}

export function Pagination({
  meta,
  loading = false,
  totalLabel = '条记录',
  onPageChange,
}: {
  meta: PaginationMeta
  loading?: boolean
  totalLabel?: string
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(meta.totalPages, 1)
  return (
    <div className={cx('ui-pagination')}>
      <span>
        共 {meta.total} {totalLabel}
      </span>
      <div>
        <Button
          size='sm'
          variant='outline'
          disabled={loading || meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          上一页
        </Button>
        <span>
          {meta.page}/{totalPages}
        </span>
        <Button
          size='sm'
          variant='outline'
          disabled={loading || meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}

export function ListState({
  loading,
  emptyText,
  loadingText = '加载中…',
  icon,
  className,
}: {
  loading: boolean
  emptyText: string
  loadingText?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('ui-list-state', className)}>
      {loading ? <SpinnerIcon aria-hidden='true' /> : icon}
      <span>{loading ? loadingText : emptyText}</span>
    </div>
  )
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-skeleton', className)} {...props} />
}
