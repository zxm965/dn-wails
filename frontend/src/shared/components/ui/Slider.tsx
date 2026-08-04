import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './Slider.css'

const cx = createScopedClassNames(styles)

export interface SliderProps extends Omit<
  SliderPrimitive.Root.Props<number>,
  'children' | 'className' | 'onValueChange'
> {
  className?: string
  'aria-label': string
  onValueChange?: (value: number) => void
}

export function Slider({ className, 'aria-label': ariaLabel, onValueChange, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      {...props}
      data-ui='slider'
      className={cx('ui-slider', className)}
      onValueChange={(value) => onValueChange?.(value)}
    >
      <SliderPrimitive.Control className={cx('ui-slider-control')}>
        <SliderPrimitive.Track className={cx('ui-slider-track')}>
          <SliderPrimitive.Indicator className={cx('ui-slider-indicator')} />
          <SliderPrimitive.Thumb className={cx('ui-slider-thumb')} getAriaLabel={() => ariaLabel} />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
