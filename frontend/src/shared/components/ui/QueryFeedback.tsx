import { Button } from './Button'
import { Skeleton } from './Layout'

import { styles } from './QueryFeedback.css'

type SkeletonLayout = 'list' | 'table' | 'cards'

function Line({ width = 'medium' }: { width?: 'short' | 'medium' | 'long' }) {
  return <Skeleton className={styles.line} data-width={width} aria-hidden='true' />
}

function LoadingContent({ layout }: { layout: SkeletonLayout }) {
  if (layout === 'table') {
    return (
      <div className={styles.table}>
        {[0, 1, 2, 3].map((row) => (
          <div className={styles.tableRow} key={row}>
            {['short', row % 2 ? 'medium' : 'long', 'medium', 'short', 'short', 'long', 'medium'].map(
              (width, column) => (
                <div key={column} className={styles.cell} data-secondary={column > 2 || undefined}>
                  <Line width={width as 'short' | 'medium' | 'long'} />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={layout === 'cards' ? styles.cards : styles.list}>
      {Array.from({ length: layout === 'cards' ? 2 : 3 }, (_, index) => (
        <div key={index} className={layout === 'cards' ? styles.card : styles.message}>
          <div className={styles.identity}>
            <Skeleton className={styles.icon} aria-hidden='true' />
            <div className={styles.copy}>
              <Line width={index % 2 ? 'medium' : 'long'} />
              <Line width='short' />
            </div>
            <Skeleton className={styles.badge} aria-hidden='true' />
          </div>
          {layout === 'cards' ? (
            <>
              <div className={styles.section}>
                <Line width='short' />
                <Line width='long' />
                <div className={styles.actions}>
                  <Skeleton className={styles.control} aria-hidden='true' />
                  <Line width='medium' />
                  <Skeleton className={styles.control} aria-hidden='true' />
                </div>
              </div>
              <div className={styles.copy}>
                {[0, 1, 2].map((key) => (
                  <div className={styles.actions} key={key}>
                    <Line width='medium' />
                    <Skeleton className={styles.badge} aria-hidden='true' />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.excerpt}>
              <Line width={index % 2 ? 'long' : 'medium'} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function QueryFeedback({
  loading,
  error,
  hasData,
  onRetry,
  layout = 'list',
}: {
  loading: boolean
  error: string
  hasData: boolean
  onRetry: () => void
  layout?: SkeletonLayout
}) {
  if (error)
    return (
      <div className={styles.error} role='alert'>
        <span>{error}</span>
        <Button variant='outline' disabled={loading} onClick={onRetry}>
          重试
        </Button>
      </div>
    )
  if (!loading) return null
  if (hasData)
    return (
      <div className={styles.refresh} role='status'>
        正在刷新…
      </div>
    )
  return (
    <div className={styles.loading} role='status' aria-label='正在加载列表'>
      <div className={styles.content} aria-hidden='true'>
        <LoadingContent layout={layout} />
      </div>
    </div>
  )
}
