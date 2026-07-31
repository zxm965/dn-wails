import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { HTMLAttributes } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { Button } from './Button'

import { classes as styles } from './Dialog.css'

const cx = createScopedClassNames(styles)

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export type DialogSize = 'sm' | 'md' | 'lg'

export function DialogContent({
  className,
  children,
  size = 'md',
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { size?: DialogSize; showCloseButton?: boolean }) {
  const resolvedClassName: DialogPrimitive.Popup.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-dialog', className(state)) : cx('ui-dialog', className)

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={cx('ui-dialog-backdrop')} />
      <DialogPrimitive.Viewport className={cx('ui-dialog-viewport')}>
        <DialogPrimitive.Popup data-ui='dialog' data-size={size} className={resolvedClassName} {...props}>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label='关闭'
              className={cx('ui-dialog-close')}
              render={<Button size='sm' variant='ghost' />}
            >
              <X aria-hidden='true' />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cx('ui-dialog-header', className)} {...props} />
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  const resolvedClassName: DialogPrimitive.Title.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-dialog-title', className(state))
      : cx('ui-dialog-title', className)
  return <DialogPrimitive.Title className={resolvedClassName} {...props} />
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  const resolvedClassName: DialogPrimitive.Description.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-dialog-description', className(state))
      : cx('ui-dialog-description', className)
  return <DialogPrimitive.Description className={resolvedClassName} {...props} />
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-dialog-body', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={cx('ui-dialog-footer', className)} {...props} />
}
