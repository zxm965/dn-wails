import { Skeleton } from '@/shared/components/ui'
import { classNames, createScopedClassNames } from '@/shared/lib/classNames'

import { WEEKLY_FLAGS } from '../model/dnSystem'

import { styles as planStyles } from './DnSystem.css'
import { styles as skeletonStyles } from './DnWeeklyPlanSkeleton.css'

const cx = createScopedClassNames(planStyles)

function Shape({ className }: { className: string }) {
  return <Skeleton className={classNames(skeletonStyles.shape, className)} aria-hidden='true' />
}

export function DnWeeklyPlanSkeleton() {
  return (
    <div className={cx('dn-plan-grid')} aria-hidden='true'>
      {[0, 1].map((index) => (
        <article className={cx('dn-plan-card')} key={index}>
          <header className={cx('dn-plan-card-header')}>
            <Shape className={skeletonStyles.avatar} />
            <div className={cx('dn-plan-identity')}>
              <Shape className={classNames(cx('dn-plan-role-name'), skeletonStyles.line)} />
              <Shape className={classNames(cx('dn-plan-profession'), skeletonStyles.line)} />
            </div>
            <Shape className={skeletonStyles.badge} />
          </header>
          <section className={cx('dn-plan-commission-panel')}>
            <div className={cx('dn-plan-commission-heading')}>
              <div className={cx('dn-plan-commission-copy')}>
                <Shape className={classNames(cx('dn-plan-commission-label'), skeletonStyles.label)} />
                <Shape className={classNames(cx('dn-plan-commission-meta'), skeletonStyles.label)} />
              </div>
              <Shape className={classNames(cx('dn-plan-commission-count'), skeletonStyles.count)} />
            </div>
            <Shape className={skeletonStyles.progress} />
            <div className={cx('dn-plan-counter-actions')}>
              <Shape className={skeletonStyles.control} />
              <Shape className={classNames(cx('dn-plan-counter-copy'), skeletonStyles.line)} />
              <Shape className={skeletonStyles.control} />
            </div>
          </section>
          <section className={cx('dn-plan-weekly-section')}>
            <div className={cx('dn-plan-weekly-heading')}>
              <div className={cx('dn-plan-weekly-copy')}>
                <Shape className={classNames(cx('dn-plan-weekly-title'), skeletonStyles.label)} />
                <Shape className={classNames(cx('dn-plan-weekly-meta'), skeletonStyles.description)} />
              </div>
              <Shape className={skeletonStyles.badge} />
            </div>
            <div className={cx('dn-plan-flags')}>
              {WEEKLY_FLAGS.map((flag) => (
                <div className={cx('dn-plan-flag')} key={flag.key}>
                  <div className={cx('dn-plan-flag-copy')}>
                    <Shape className={classNames(cx('dn-plan-flag-title'), skeletonStyles.flagLabel)} />
                    <Shape className={classNames(cx('dn-plan-flag-status'), skeletonStyles.flagStatus)} />
                  </div>
                  <Shape className={skeletonStyles.toggle} />
                </div>
              ))}
            </div>
          </section>
          <footer className={cx('dn-plan-actions')}>
            <Shape className={classNames(cx('dn-plan-sort'), skeletonStyles.label)} />
            <div className={cx('dn-plan-action-buttons')}>
              <Shape className={skeletonStyles.action} />
              <Shape className={skeletonStyles.action} />
            </div>
          </footer>
        </article>
      ))}
    </div>
  )
}
