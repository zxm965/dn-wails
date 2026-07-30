import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { HTMLAttributes } from 'react'

import { AppButton } from '@/shared/components/button'
import { classNames } from '@/shared/lib/classNames'

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
    typeof className === 'function'
      ? (state) => classNames('ui-dialog', className(state))
      : classNames('ui-dialog', className)

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className='ui-dialog-backdrop' />
      <DialogPrimitive.Viewport className='ui-dialog-viewport'>
        <DialogPrimitive.Popup data-ui='dialog' data-size={size} className={resolvedClassName} {...props}>
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label='关闭'
              className='ui-dialog-close'
              render={<AppButton size='sm' variant='ghost' />}
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
  return <header className={classNames('ui-dialog-header', className)} {...props} />
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  const resolvedClassName: DialogPrimitive.Title.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-dialog-title', className(state))
      : classNames('ui-dialog-title', className)
  return <DialogPrimitive.Title className={resolvedClassName} {...props} />
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  const resolvedClassName: DialogPrimitive.Description.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-dialog-description', className(state))
      : classNames('ui-dialog-description', className)
  return <DialogPrimitive.Description className={resolvedClassName} {...props} />
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('ui-dialog-body', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={classNames('ui-dialog-footer', className)} {...props} />
}
