import { LoaderCircle, type LucideIcon, type LucideProps } from 'lucide-react'

import { classNames } from '@/shared/lib/classNames'

import { spinnerIcon } from './Spinner.css'

export interface SpinnerIconProps extends LucideProps {
  icon?: LucideIcon
  spinning?: boolean
}

export function SpinnerIcon({ icon: Icon = LoaderCircle, spinning = true, className, ...props }: SpinnerIconProps) {
  return <Icon className={classNames(spinning && spinnerIcon, className)} {...props} />
}
