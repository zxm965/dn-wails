import { UserRound } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import type { Profile } from '../api/accountApi'

import { styles } from './AccountTitleBarButton.css'

const cx = createScopedClassNames(styles)

export function AccountTitleBarButton({ user, onClick }: { user: Profile | null; onClick: () => void }) {
  const initial = (user?.name || user?.email || user?.account || 'U').trim().charAt(0).toUpperCase()
  const label = user ? '打开个人信息' : '未登录，点击登录'

  return (
    <Button
      className={cx('account-titlebar-button')}
      size='sm'
      type='button'
      variant='ghost'
      aria-label={label}
      title={user ? user.name || user.account : label}
      onClick={onClick}
    >
      <Avatar className={cx('account-titlebar-avatar')}>
        <AvatarImage src={user?.avatar || undefined} alt='' />
        <AvatarFallback className={cx('account-titlebar-avatar-fallback')}>
          {user ? initial : <UserRound className={cx('account-titlebar-placeholder-icon')} aria-hidden='true' />}
        </AvatarFallback>
      </Avatar>
    </Button>
  )
}
