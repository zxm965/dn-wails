import { style } from '@vanilla-extract/css'

const processPage = style({
  width: 'min(100%, var(--page-content-max-width))',
  minWidth: '0',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'dn-process-page',
  containerType: 'inline-size',
})

const processCard = style({
  minWidth: '0',
})

const processSettingsCard = style({
  minWidth: '0',
})

const processSettingsHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '18px',
})

const processSettingsStatus = style({
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  whiteSpace: 'nowrap',
})

const processSettingsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '20px',
  '@container': {
    'dn-process-page (max-width: 700px)': {
      gridTemplateColumns: '1fr',
    },
  },
})

const processSettingsField = style({
  minWidth: '0',
})

const processSettingsFieldLabel = style({
  display: 'block',
  marginBottom: '9px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: '700',
})

const processSettingsInlineNote = style({
  display: 'grid',
  alignContent: 'start',
  gap: '8px',
  color: 'var(--text-secondary)',
})

const processSettingsNoteCopy = style({
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  lineHeight: '1.55',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const processSettingsToggle = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '18px',
  marginTop: '20px',
  paddingTop: '14px',
  borderTop: '1px solid var(--border-subtle)',
  cursor: 'pointer',
})

const processSettingsToggleCopy = style({
  minWidth: '0',
  display: 'grid',
  gap: '5px',
})

const processSettingsToggleTitle = style({
  display: 'block',
  color: 'var(--text-primary)',
  fontSize: '13px',
})

const processSettingsToggleDescription = style({
  display: 'block',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  lineHeight: '1.45',
})

const processSettingsError = style({
  margin: '0 0 14px',
  color: 'var(--danger-text)',
  fontSize: '12px',
  lineHeight: '1.5',
})

const processIntro = style({
  display: 'grid',
  gap: '8px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.65',
})

const processIntroStrong = style({
  color: 'var(--text-primary)',
  fontSize: '13px',
})

const processMeta = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '12px',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const processMetaText = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const processList = style({
  display: 'grid',
  gap: '8px',
})

const processRow = style({
  width: '100%',
  minWidth: '0',
  height: 'auto',
  minHeight: '72px',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  justifyContent: 'stretch',
  gap: '16px',
  padding: '12px 14px',
  textAlign: 'left',
  borderColor: 'var(--border-subtle)',
  borderRadius: '12px',
  selectors: {
    '&[aria-pressed="true"]': {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 45%, var(--border-strong))',
    },
  },
})

const processRowMain = style({
  minWidth: '0',
  display: 'grid',
  gap: '4px',
})

const processRowTitle = style({
  minWidth: '0',
  overflow: 'hidden',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: '800',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const processRowPath = style({
  minWidth: '0',
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const processRowMeta = style({
  flex: '0 0 auto',
  color: 'var(--text-secondary)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '11px',
  fontWeight: '700',
})

const processActions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '8px',
})

const processSelectedTarget = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '14px',
  marginTop: '16px',
  padding: '12px 14px',
  background: 'var(--danger-background)',
  border: '1px solid var(--danger-border)',
  borderRadius: '10px',
})

const processSelectedTargetCopy = style({
  minWidth: '0',
  display: 'grid',
  gap: '3px',
})

const processSelectedTargetTitle = style({
  color: 'var(--danger-text)',
  fontSize: '12px',
  fontWeight: '800',
})

const processSelectedTargetPath = style({
  minWidth: '0',
  overflow: 'hidden',
  color: 'var(--text-secondary)',
  fontSize: '10px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const processShortcutHint = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: 'var(--text-tertiary)',
  fontSize: '11px',
})

const processShortcutKey = style({
  padding: '2px 6px',
  color: 'var(--text-primary)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontWeight: '800',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '5px',
})

const processEmpty = style({
  minHeight: '200px',
})

export const styles = {
  'dn-process-page': processPage,
  'dn-process-card': processCard,
  'dn-process-settings-card': processSettingsCard,
  'dn-process-settings-header': processSettingsHeader,
  'dn-process-settings-status': processSettingsStatus,
  'dn-process-settings-grid': processSettingsGrid,
  'dn-process-settings-field': processSettingsField,
  'dn-process-settings-field-label': processSettingsFieldLabel,
  'dn-process-settings-inline-note': processSettingsInlineNote,
  'dn-process-settings-note-copy': processSettingsNoteCopy,
  'dn-process-settings-toggle': processSettingsToggle,
  'dn-process-settings-toggle-copy': processSettingsToggleCopy,
  'dn-process-settings-toggle-title': processSettingsToggleTitle,
  'dn-process-settings-toggle-description': processSettingsToggleDescription,
  'dn-process-settings-error': processSettingsError,
  'dn-process-intro': processIntro,
  'dn-process-intro-strong': processIntroStrong,
  'dn-process-meta': processMeta,
  'dn-process-meta-text': processMetaText,
  'dn-process-list': processList,
  'dn-process-row': processRow,
  'dn-process-row-main': processRowMain,
  'dn-process-row-title': processRowTitle,
  'dn-process-row-path': processRowPath,
  'dn-process-row-meta': processRowMeta,
  'dn-process-actions': processActions,
  'dn-process-selected-target': processSelectedTarget,
  'dn-process-selected-target-copy': processSelectedTargetCopy,
  'dn-process-selected-target-title': processSelectedTargetTitle,
  'dn-process-selected-target-path': processSelectedTargetPath,
  'dn-process-shortcut-hint': processShortcutHint,
  'dn-process-shortcut-key': processShortcutKey,
  'dn-process-empty': processEmpty,
} as const
