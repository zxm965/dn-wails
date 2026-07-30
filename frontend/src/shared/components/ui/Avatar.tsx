import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { classNames } from '@/shared/lib/classNames'

export function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  const resolvedClassName: AvatarPrimitive.Root.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-avatar', className(state))
      : classNames('ui-avatar', className)
  return <AvatarPrimitive.Root className={resolvedClassName} {...props} />
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  const resolvedClassName: AvatarPrimitive.Image.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-avatar-image', className(state))
      : classNames('ui-avatar-image', className)
  return <AvatarPrimitive.Image className={resolvedClassName} {...props} />
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  const resolvedClassName: AvatarPrimitive.Fallback.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-avatar-fallback', className(state))
      : classNames('ui-avatar-fallback', className)
  return <AvatarPrimitive.Fallback className={resolvedClassName} {...props} />
}
