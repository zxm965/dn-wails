import type { ImgHTMLAttributes } from 'react'

import cupearIcon from '@/assets/images/cupear.svg'

interface BrandIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  title?: string
}

export function BrandIcon({ className, title, ...props }: BrandIconProps) {
  return (
    <img
      {...props}
      className={className}
      src={cupearIcon}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      title={title}
      draggable={false}
    />
  )
}
