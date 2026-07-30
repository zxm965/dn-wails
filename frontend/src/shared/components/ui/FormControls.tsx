import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { Check, Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useState } from 'react'

import { AppButton } from '@/shared/components/button'
import { classNames } from '@/shared/lib/classNames'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label data-ui='label' className={classNames('ui-label', className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input data-ui='input' className={classNames('ui-input', className)} {...props} />
}

export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <span className={classNames('ui-password-input', className)}>
      <Input {...props} className='ui-password-input-control' type={visible ? 'text' : 'password'} />
      <AppButton
        className='ui-password-input-toggle'
        size='sm'
        variant='ghost'
        type='button'
        aria-label={visible ? '隐藏密码' : '显示密码'}
        title={visible ? '隐藏密码' : '显示密码'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden='true' /> : <Eye aria-hidden='true' />}
      </AppButton>
    </span>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-ui='textarea' className={classNames('ui-input', 'ui-textarea', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select data-ui='select' className={classNames('ui-input', 'ui-select', className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  const resolvedClassName: CheckboxPrimitive.Root.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-checkbox', className(state))
      : classNames('ui-checkbox', className)
  return (
    <CheckboxPrimitive.Root data-ui='checkbox' className={resolvedClassName} {...props}>
      <CheckboxPrimitive.Indicator className='ui-checkbox-indicator'>
        <Check aria-hidden='true' />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  const resolvedClassName: SwitchPrimitive.Root.Props['className'] =
    typeof className === 'function'
      ? (state) => classNames('ui-switch', className(state))
      : classNames('ui-switch', className)
  return (
    <SwitchPrimitive.Root data-ui='switch' className={resolvedClassName} {...props}>
      <SwitchPrimitive.Thumb className='ui-switch-thumb' />
    </SwitchPrimitive.Root>
  )
}
