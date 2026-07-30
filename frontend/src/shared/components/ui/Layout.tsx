import { LoaderCircle } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

import { AppButton } from '@/shared/components/button'
import { classNames } from '@/shared/lib/classNames'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className='ui-page-header'>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className='ui-page-header-actions'>{actions}</div>}
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
    <div className='ui-pagination'>
      <span>
        共 {meta.total} {totalLabel}
      </span>
      <div>
        <AppButton
          size='sm'
          variant='outline'
          disabled={loading || meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          上一页
        </AppButton>
        <span>
          {meta.page}/{totalPages}
        </span>
        <AppButton
          size='sm'
          variant='outline'
          disabled={loading || meta.page >= totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          下一页
        </AppButton>
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
    <div className={classNames('ui-list-state', className)}>
      {loading ? <LoaderCircle className='ui-spin' aria-hidden='true' /> : icon}
      <span>{loading ? loadingText : emptyText}</span>
    </div>
  )
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('ui-skeleton', className)} {...props} />
}
