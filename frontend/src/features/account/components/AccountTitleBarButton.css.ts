import { style } from '@vanilla-extract/css'

const accountTitlebarButton = style({
  width: '28px',
  minWidth: '28px',
  padding: '0',
  borderRadius: '50%',
})

const accountTitlebarAvatar = style({
  width: '20px',
  height: '20px',
  flex: '0 0 auto',
  borderColor: 'color-mix(in srgb, var(--accent) 38%, var(--border-strong))',
})

const accountTitlebarAvatarFallback = style({
  fontSize: '9px',
})

const accountTitlebarPlaceholderIcon = style({
  width: '12px',
  height: '12px',
})

export const styles = {
  'account-titlebar-button': accountTitlebarButton,
  'account-titlebar-avatar': accountTitlebarAvatar,
  'account-titlebar-avatar-fallback': accountTitlebarAvatarFallback,
  'account-titlebar-placeholder-icon': accountTitlebarPlaceholderIcon,
} as const
