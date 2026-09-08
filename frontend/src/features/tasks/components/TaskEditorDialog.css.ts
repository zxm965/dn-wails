import { style } from '@vanilla-extract/css'

const taskEditorForm = style({
  minWidth: '0',
})

const taskEditorBody = style({
  display: 'grid',
  gap: '16px',
})

const taskEditorField = style({
  minWidth: '0',
  display: 'grid',
  gap: '7px',
})

const taskEditorLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
})

const taskEditorIcon = style({
  width: '15px',
  height: '15px',
  color: 'var(--accent)',
})

const taskEditorGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
  '@media': {
    '(max-width: 620px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
})

const taskEditorSwitchField = style({
  minWidth: '0',
  minHeight: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '24px 10px 0',
})

const taskEditorRepeat = style({
  display: 'grid',
  gap: '10px',
  padding: '14px',
  background: 'color-mix(in srgb, var(--surface-muted) 68%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--control-radius)',
})

const taskEditorSectionTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontWeight: '800',
})

const taskEditorRepeatGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  alignItems: 'end',
  gap: '10px',
  '@media': {
    '(max-width: 620px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
})

const taskEditorCompactField = style({
  minWidth: '0',
  display: 'grid',
  gap: '5px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
})

const taskEditorHelp = style({
  color: 'var(--danger-text)',
})

const taskEditorFooter = style({
  justifyContent: 'space-between',
  gap: '12px',
})

const taskEditorActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
})

export const styles = {
  'task-editor-form': taskEditorForm,
  'task-editor-body': taskEditorBody,
  'task-editor-field': taskEditorField,
  'task-editor-label': taskEditorLabel,
  'task-editor-icon': taskEditorIcon,
  'task-editor-grid': taskEditorGrid,
  'task-editor-switch-field': taskEditorSwitchField,
  'task-editor-repeat': taskEditorRepeat,
  'task-editor-section-title': taskEditorSectionTitle,
  'task-editor-repeat-grid': taskEditorRepeatGrid,
  'task-editor-compact-field': taskEditorCompactField,
  'task-editor-help': taskEditorHelp,
  'task-editor-footer': taskEditorFooter,
  'task-editor-actions': taskEditorActions,
} as const
