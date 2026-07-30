import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import type { HTMLAttributes } from 'react'

import { AppButton, type AppButtonProps } from '@/shared/components/button'
import { classNames } from '@/shared/lib/classNames'

export const AlertDialog = AlertDialogPrimitive.Root

export function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  const resolvedClassName: AlertDialogPrimitive.Popup.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-dialog', 'ui-alert-dialog', className(state))
      : classNames('ui-dialog', 'ui-alert-dialog', className)
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className='ui-dialog-backdrop' />
      <AlertDialogPrimitive.Viewport className='ui-dialog-viewport'>
        <AlertDialogPrimitive.Popup className={resolvedClassName} {...props} />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={classNames('ui-dialog-header', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  const resolvedClassName: AlertDialogPrimitive.Title.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-dialog-title', className(state))
      : classNames('ui-dialog-title', className)
  return <AlertDialogPrimitive.Title className={resolvedClassName} {...props} />
}

export function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  const resolvedClassName: AlertDialogPrimitive.Description.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-dialog-description', className(state))
      : classNames('ui-dialog-description', className)
  return <AlertDialogPrimitive.Description className={resolvedClassName} {...props} />
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={classNames('ui-dialog-footer', className)} {...props} />
}

export function AlertDialogAction(props: AppButtonProps) {
  return <AppButton {...props} />
}

export function AlertDialogCancel({
  variant = 'outline',
  ...props
}: AlertDialogPrimitive.Close.Props & AppButtonProps) {
  return <AlertDialogPrimitive.Close render={<AppButton variant={variant} />} {...props} />
}
