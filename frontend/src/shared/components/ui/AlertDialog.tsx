import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import type { HTMLAttributes } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { Button, type ButtonProps } from './Button'

import { styles as alertDialogStyles } from './AlertDialog.css'
import { styles as dialogStyles } from './Dialog.css'

const cx = createScopedClassNames({ ...dialogStyles, ...alertDialogStyles })

export const AlertDialog = AlertDialogPrimitive.Root

export function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  const resolvedClassName: AlertDialogPrimitive.Popup.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-dialog', 'ui-alert-dialog', className(state))
      : cx('ui-dialog', 'ui-alert-dialog', className)
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className={cx('ui-dialog-backdrop')} />
      <AlertDialogPrimitive.Viewport className={cx('ui-dialog-viewport')}>
        <AlertDialogPrimitive.Popup className={resolvedClassName} {...props} />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cx('ui-dialog-header', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  const resolvedClassName: AlertDialogPrimitive.Title.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-dialog-title', className(state))
      : cx('ui-dialog-title', className)
  return <AlertDialogPrimitive.Title className={resolvedClassName} {...props} />
}

export function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  const resolvedClassName: AlertDialogPrimitive.Description.Props['className'] =
    typeof className === 'function'
      ? (state) => cx('ui-dialog-description', className(state))
      : cx('ui-dialog-description', className)
  return <AlertDialogPrimitive.Description className={resolvedClassName} {...props} />
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={cx('ui-dialog-footer', className)} {...props} />
}

export function AlertDialogAction(props: ButtonProps) {
  return <Button {...props} />
}

export function AlertDialogCancel({ variant = 'outline', ...props }: AlertDialogPrimitive.Close.Props & ButtonProps) {
  return <AlertDialogPrimitive.Close render={<Button variant={variant} />} {...props} />
}
