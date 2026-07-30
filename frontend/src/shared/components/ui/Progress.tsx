import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { classNames } from '@/shared/lib/classNames'

export function Progress({ className, value, ...props }: ProgressPrimitive.Root.Props) {
  const resolvedClassName: ProgressPrimitive.Root.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-progress', className(state))
      : classNames('ui-progress', className)
  return (
    <ProgressPrimitive.Root className={resolvedClassName} value={value} {...props}>
      <ProgressPrimitive.Track className='ui-progress-track'>
        <ProgressPrimitive.Indicator className='ui-progress-indicator' />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}
