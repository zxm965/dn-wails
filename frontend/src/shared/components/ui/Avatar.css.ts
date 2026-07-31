import { style } from '@vanilla-extract/css'

const uiAvatar = style({
  position: 'relative',
  width: '72px',
  height: '72px',
  display: 'flex',
  overflow: 'hidden',
  color: 'var(--text-secondary)',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-strong)',
  borderRadius: '50%',
})

const uiAvatarImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
})

const uiAvatarFallback = style({
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  fontSize: '24px',
  fontWeight: '800',
})

export const classes = {
  'ui-avatar': uiAvatar,
  'ui-avatar-image': uiAvatarImage,
  'ui-avatar-fallback': uiAvatarFallback,
} as const
