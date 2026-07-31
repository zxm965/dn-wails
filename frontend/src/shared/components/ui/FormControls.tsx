import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { Check, Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useState } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { Button } from './Button'

import { classes as styles } from './FormControls.css'

const cx = createScopedClassNames(styles)

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label data-ui='label' className={cx('ui-label', className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input data-ui='input' className={cx('ui-input', className)} {...props} />
}

export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <span className={cx('ui-password-input', className)}>
      <Input {...props} className={cx('ui-password-input-control')} type={visible ? 'text' : 'password'} />
      <Button
        className={cx('ui-password-input-toggle')}
        size='sm'
        variant='ghost'
        type='button'
        aria-label={visible ? '隐藏密码' : '显示密码'}
        title={visible ? '隐藏密码' : '显示密码'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden='true' /> : <Eye aria-hidden='true' />}
      </Button>
    </span>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-ui='textarea' className={cx('ui-input', 'ui-textarea', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select data-ui='select' className={cx('ui-input', 'ui-select', className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  const resolvedClassName: CheckboxPrimitive.Root.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-checkbox', className(state)) : cx('ui-checkbox', className)
  return (
    <CheckboxPrimitive.Root data-ui='checkbox' className={resolvedClassName} {...props}>
      <CheckboxPrimitive.Indicator className={cx('ui-checkbox-indicator')}>
        <Check aria-hidden='true' />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  const resolvedClassName: SwitchPrimitive.Root.Props['className'] =
    typeof className === 'function' ? (state) => cx('ui-switch', className(state)) : cx('ui-switch', className)
  return (
    <SwitchPrimitive.Root data-ui='switch' className={resolvedClassName} {...props}>
      <SwitchPrimitive.Thumb className={cx('ui-switch-thumb')} />
    </SwitchPrimitive.Root>
  )
}
