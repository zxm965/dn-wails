import { LoaderCircle, type LucideIcon, type LucideProps } from 'lucide-react'

import { classNames } from '@/shared/lib/classNames'

import { styles } from './Spinner.css'

export interface SpinnerIconProps extends LucideProps {
  icon?: LucideIcon
  spinning?: boolean
}

export function SpinnerIcon({ icon: Icon = LoaderCircle, spinning = true, className, ...props }: SpinnerIconProps) {
  return <Icon className={classNames(spinning && styles.icon, className)} {...props} />
}
