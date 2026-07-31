import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './Avatar.css'

const cx = createScopedClassNames(styles)

export function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  const resolvedClassName: AvatarPrimitive.Root.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-avatar', className(state)) : cx('ui-avatar', className)
  return <AvatarPrimitive.Root className={resolvedClassName} {...props} />
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  const resolvedClassName: AvatarPrimitive.Image.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-avatar-image', className(state))
      : cx('ui-avatar-image', className)
  return <AvatarPrimitive.Image className={resolvedClassName} {...props} />
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  const resolvedClassName: AvatarPrimitive.Fallback.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-avatar-fallback', className(state))
      : cx('ui-avatar-fallback', className)
  return <AvatarPrimitive.Fallback className={resolvedClassName} {...props} />
}
