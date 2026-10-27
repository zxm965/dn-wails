import type { ReactNode } from 'react'

import { classNames } from '@/shared/lib/classNames'

import { styles } from './DnField.css'

interface DnFieldProps {
  label: string
  className?: string
  children: ReactNode
}

export function DnField({ label, className, children }: DnFieldProps) {
  return (
    <label className={classNames(styles.root, className)}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  )
}
