import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './Progress.css'

const cx = createScopedClassNames(styles)

export function Progress({ className, value, ...props }: ProgressPrimitive.Root.Props) {
  const resolvedClassName: ProgressPrimitive.Root.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-progress', className(state)) : cx('ui-progress', className)
  return (
    <ProgressPrimitive.Root className={resolvedClassName} value={value} {...props}>
      <ProgressPrimitive.Track className={cx('ui-progress-track')}>
        <ProgressPrimitive.Indicator className={cx('ui-progress-indicator')} />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}
