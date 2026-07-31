import { style } from '@vanilla-extract/css'

const appShell = style({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  color: 'var(--text-primary)',
  background: 'var(--app-background)',
})

const appWorkspace = style({
  minWidth: '0',
  minHeight: '0',
  flex: '1',
  display: 'flex',
  overflow: 'hidden',
})

const appContent = style({
  minWidth: '0',
  minHeight: '0',
  flex: '1',
  overflowX: 'hidden',
  overflowY: 'auto',
  containerName: 'app-content',
  containerType: 'inline-size',
  overscrollBehavior: 'contain',
  scrollbarGutter: 'stable',
  background: 'radial-gradient(circle at 92% 0%, var(--accent-muted), transparent 28%), var(--app-background)',
})

export const classes = {
  'app-shell': appShell,
  'app-workspace': appWorkspace,
  'app-content': appContent,
} as const
