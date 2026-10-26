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
  background: 'radial-gradient(circle at 92% 0%, var(--accent-muted), transparent 28%), var(--app-background)',
})

const contentViewport = style({
  containerName: 'app-content',
  containerType: 'size',
})

export const styles = {
  contentViewport,
  'app-shell': appShell,
  'app-workspace': appWorkspace,
  'app-content': appContent,
} as const
