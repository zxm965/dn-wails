import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { classes as styles } from './Button.css'

const cx = createScopedClassNames(styles)

export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize
  variant?: ButtonVariant
  ripple?: boolean
}

function createButtonRipple(element: HTMLButtonElement, event: MouseEvent<HTMLButtonElement>) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const hasPointerPosition = event.detail > 0
  const originX = hasPointerPosition ? event.clientX - rect.left : rect.width / 2
  const originY = hasPointerPosition ? event.clientY - rect.top : rect.height / 2
  const wave = document.createElement('span')
  wave.className = cx('ui-button-ripple')
  wave.style.width = `${size}px`
  wave.style.height = `${size}px`
  wave.style.left = `${originX - size / 2}px`
  wave.style.top = `${originY - size / 2}px`

  const removeWave = () => wave.remove()
  wave.addEventListener('animationend', removeWave, { once: true })
  window.setTimeout(removeWave, 700)
  element.appendChild(wave)
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { size, variant = 'primary', ripple = true, className, disabled, onClick, ...props },
  ref,
) {
  const resolvedClassName = ['ui-button', `ui-button-${variant}`, className].filter(Boolean).join(' ')

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (ripple && !disabled && event.currentTarget.getAttribute('aria-disabled') !== 'true') {
      createButtonRipple(event.currentTarget, event)
    }
    onClick?.(event)
  }

  return (
    <button
      {...props}
      ref={ref}
      className={cx(resolvedClassName)}
      data-button-size={size}
      disabled={disabled}
      onClick={handleClick}
    />
  )
})
