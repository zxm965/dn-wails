import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './Select.css'

const cx = createScopedClassNames(styles)

export type SelectValue = string | number

export interface SelectOption<Value extends SelectValue> {
  value: Value
  label: string
  disabled?: boolean
}

export interface SelectProps<Value extends SelectValue> extends Omit<
  SelectPrimitive.Root.Props<Value>,
  'children' | 'items' | 'multiple' | 'onValueChange'
> {
  className?: string
  options: ReadonlyArray<SelectOption<Value>>
  placeholder?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  onValueChange?: (value: Value) => void
}

export function Select<Value extends SelectValue>({
  className,
  options,
  placeholder = '请选择',
  disabled,
  onValueChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps<Value>) {
  return (
    <SelectPrimitive.Root
      {...props}
      items={options}
      disabled={disabled}
      onValueChange={(value) => {
        if (value !== null) onValueChange?.(value)
      }}
    >
      <SelectPrimitive.Trigger
        data-ui='select'
        className={cx('ui-select-trigger', className)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        <SelectPrimitive.Value className={cx('ui-select-value')} placeholder={placeholder} />
        <SelectPrimitive.Icon className={cx('ui-select-icon')}>
          <ChevronDown aria-hidden='true' />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className={cx('ui-select-positioner')}
          side='bottom'
          align='start'
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup className={cx('ui-select-popup')}>
            <SelectPrimitive.ScrollUpArrow className={cx('ui-select-scroll-arrow')}>
              <ChevronUp aria-hidden='true' />
            </SelectPrimitive.ScrollUpArrow>
            <SelectPrimitive.List className={cx('ui-select-list')}>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={String(option.value)}
                  className={cx('ui-select-item')}
                  value={option.value}
                  disabled={option.disabled}
                  label={option.label}
                >
                  <SelectPrimitive.ItemText className={cx('ui-select-item-text')}>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className={cx('ui-select-item-indicator')}>
                    <Check aria-hidden='true' />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
            <SelectPrimitive.ScrollDownArrow className={cx('ui-select-scroll-arrow')}>
              <ChevronDown aria-hidden='true' />
            </SelectPrimitive.ScrollDownArrow>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
