import type { ButtonHTMLAttributes } from 'react'

import './AppButton.css'

export type AppButtonSize = 'sm' | 'md' | 'lg'

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: AppButtonSize
}

export function AppButton({ size, className, ...props }: AppButtonProps) {
  const resolvedClassName = className ? `app-button ${className}` : 'app-button'
  return <button {...props} className={resolvedClassName} data-button-size={size} />
}
