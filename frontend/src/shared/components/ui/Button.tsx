import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react'

import { classNames } from '@/shared/lib/classNames'

import { styles } from './Button.css'

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
  wave.className = styles.ripple
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
  const resolvedClassName = classNames(
    styles.root,
    styles.variants[variant],
    size ? styles.sizes[size] : undefined,
    className,
  )

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
      className={resolvedClassName}
      data-button-size={size}
      data-button-variant={variant}
      disabled={disabled}
      onClick={handleClick}
    />
  )
})
