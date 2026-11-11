import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Button } from '@/shared/components/ui'
import { getAppViewPath } from '@/shared/navigation'

import { styles } from './PageError.css'

export function PageError() {
  const location = useLocation()
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => heading.current?.focus(), [])

  return (
    <section className={styles.page} aria-labelledby='page-error-title'>
      <div className={styles.card}>
        <h1 id='page-error-title' ref={heading} tabIndex={-1} className={styles.title}>
          当前页面遇到问题
        </h1>
        <p className={styles.description}>
          可以重新打开此页，或通过侧栏切换到其他功能；此页尚未保存的内容可能需要重新填写。
        </p>
        <div className={styles.actions}>
          <Button onClick={() => void navigate(location.pathname + location.search + location.hash, { replace: true })}>
            重新打开页面
          </Button>
          <Button variant='outline' onClick={() => void navigate(getAppViewPath('settings'))}>
            返回设置
          </Button>
        </div>
      </div>
    </section>
  )
}
