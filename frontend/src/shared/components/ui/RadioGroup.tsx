import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import type { ReactNode } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './RadioGroup.css'

const cx = createScopedClassNames(styles)

export type RadioGroupValue = string | number
export type RadioGroupVariant = 'segmented' | 'chips'

export interface RadioGroupOption<Value extends RadioGroupValue> {
  value: Value
  label: ReactNode
  leading?: ReactNode
  title?: string
  disabled?: boolean
}

export interface RadioGroupProps<Value extends RadioGroupValue> extends Omit<
  RadioGroupPrimitive.Props<Value>,
  'children' | 'className' | 'onValueChange'
> {
  className?: string
  options: ReadonlyArray<RadioGroupOption<Value>>
  variant?: RadioGroupVariant
  onValueChange?: (value: Value) => void
}

export function RadioGroup<Value extends RadioGroupValue>({
  className,
  options,
  variant = 'segmented',
  onValueChange,
  ...props
}: RadioGroupProps<Value>) {
  return (
    <RadioGroupPrimitive
      {...props}
      data-ui='radio-group'
      data-variant={variant}
      className={cx('ui-radio-group', className)}
      onValueChange={(value) => onValueChange?.(value)}
    >
      {options.map((option) => (
        <label key={String(option.value)} className={cx('ui-radio-item')} title={option.title}>
          <Radio.Root
            className={cx('ui-radio-control')}
            value={option.value}
            disabled={option.disabled}
            aria-label={typeof option.label === 'string' ? option.label : option.title}
          />
          {option.leading && (
            <span className={cx('ui-radio-leading')} aria-hidden='true'>
              {option.leading}
            </span>
          )}
          <span className={cx('ui-radio-label')}>{option.label}</span>
        </label>
      ))}
    </RadioGroupPrimitive>
  )
}
