import { style } from '@vanilla-extract/css'

const isActive = style({})
const isPinned = style({})
const isSaved = style({})
const isPending = style({})
const isSaving = style({})
const isError = style({})

const quickNotesPage = style({
  width: 'min(100%, var(--page-content-max-width))',
  minWidth: '0',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'quick-notes-page',
  containerType: 'inline-size',
})

const quickNotesWorkspace = style([
  {
    minWidth: '0',
    height: 'clamp(460px, calc(100vh - 220px), 760px)',
    display: 'grid',
    gridTemplateColumns: 'minmax(250px, 0.34fr) minmax(0, 1fr)',
    overflow: 'hidden',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
  },
  {
    '@container': {
      'quick-notes-page (max-width: 700px)': {
        height: 'auto',
        minHeight: '0',
        gridTemplateColumns: 'minmax(0, 1fr)',
      },
    },
  },
])

const quickNotesListPanel = style([
  {
    minWidth: '0',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px',
    background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--accent) 8%)',
    borderRight: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'quick-notes-page (max-width: 700px)': {
        maxHeight: '250px',
        borderRight: '0',
        borderBottom: '1px solid var(--border-subtle)',
      },
    },
  },
])

const quickNotesSearch = style({
  position: 'relative',
  minWidth: '0',
})

const quickNotesSearchIcon = style({
  position: 'absolute',
  top: '50%',
  left: '12px',
  zIndex: '1',
  width: '15px',
  height: '15px',
  color: 'var(--text-tertiary)',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
})

const quickNotesSearchInput = style({
  width: '100%',
  paddingLeft: '35px',
})

const quickNotesListMeta = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '10px 3px 8px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const quickNotesListMetaText = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const quickNotesListMetaShortcut = style({
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const quickNotesList = style({
  minHeight: '0',
  display: 'grid',
  alignContent: 'start',
  gap: '5px',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
})

const quickNotesListItem = style({
  width: '100%',
  minWidth: '0',
  justifyContent: 'flex-start',
  padding: '0 10px',
  selectors: {
    [`&${isActive}`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
    },
  },
})

const quickNotesListItemIcon = style({
  width: '15px',
  height: '15px',
  selectors: {
    [`${quickNotesListItem}${isPinned} &`]: {
      color: 'var(--accent)',
    },
  },
})

const quickNotesListItemTitle = style({
  minWidth: '0',
  flex: '1',
  overflow: 'hidden',
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const quickNotesListItemTime = style({
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
  fontWeight: '600',
})

const quickNotesEmptyList = style({
  minHeight: '160px',
  padding: '16px',
})

const quickNotesEditorPanel = style([
  {
    minWidth: '0',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px',
  },
  {
    '@container': {
      'quick-notes-page (max-width: 700px)': {
        minHeight: '420px',
        padding: '14px',
      },
      'quick-notes-page (max-width: 430px)': {
        minHeight: '380px',
      },
    },
  },
])

const quickNotesEditorHeader = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'quick-notes-page (max-width: 520px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const quickNotesTitleInput = style({
  minWidth: '0',
  flex: '1',
  padding: '0 2px',
  fontSize: 'clamp(18px, 2.4vw, 24px)',
  fontWeight: '800',
  background: 'transparent',
  borderColor: 'transparent',
  selectors: {
    '&:hover': {
      borderColor: 'var(--border-subtle)',
    },
    '&:focus': {
      background: 'var(--surface-muted)',
      borderColor: 'var(--focus-ring)',
    },
  },
})

const quickNotesEditorActions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '5px',
})

const quickNotesSaveStatus = style({
  marginRight: '3px',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  whiteSpace: 'nowrap',
  selectors: {
    [`&${isSaved}`]: {
      color: 'var(--text-tertiary)',
    },
    [`&${isPending}, &${isSaving}`]: {
      color: 'var(--accent)',
    },
    [`&${isError}`]: {
      color: 'var(--danger-text)',
    },
  },
})

const quickNotesContent = style({
  minWidth: '0',
  minHeight: '0',
  flex: '1',
  resize: 'none',
  marginTop: '14px',
  padding: '14px',
  fontFamily: 'inherit',
  fontSize: '14px',
  lineHeight: '1.75',
  background: 'transparent',
  borderColor: 'transparent',
  selectors: {
    '&:hover': {
      background: 'color-mix(in srgb, var(--surface-muted) 52%, transparent)',
      borderColor: 'var(--border-subtle)',
    },
    '&:focus': {
      background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
      borderColor: 'var(--focus-ring)',
    },
  },
})

const quickNotesEditorFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 2px 0',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
})

const quickNotesEditorFooterItem = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const quickNotesEmptyEditor = style({
  minHeight: '100%',
  flex: '1',
})

export const styles = {
  'quick-notes-page': quickNotesPage,
  'quick-notes-workspace': quickNotesWorkspace,
  'quick-notes-list-panel': quickNotesListPanel,
  'quick-notes-search': quickNotesSearch,
  'quick-notes-search-icon': quickNotesSearchIcon,
  'quick-notes-search-input': quickNotesSearchInput,
  'quick-notes-list-meta': quickNotesListMeta,
  'quick-notes-list-meta-text': quickNotesListMetaText,
  'quick-notes-list-meta-shortcut': quickNotesListMetaShortcut,
  'quick-notes-list': quickNotesList,
  'quick-notes-list-item': quickNotesListItem,
  'quick-notes-list-item-icon': quickNotesListItemIcon,
  'quick-notes-list-item-title': quickNotesListItemTitle,
  'quick-notes-list-item-time': quickNotesListItemTime,
  'is-active': isActive,
  'is-pinned': isPinned,
  'quick-notes-empty-list': quickNotesEmptyList,
  'quick-notes-editor-panel': quickNotesEditorPanel,
  'quick-notes-editor-header': quickNotesEditorHeader,
  'quick-notes-title-input': quickNotesTitleInput,
  'quick-notes-editor-actions': quickNotesEditorActions,
  'quick-notes-save-status': quickNotesSaveStatus,
  'is-saved': isSaved,
  'is-pending': isPending,
  'is-saving': isSaving,
  'is-error': isError,
  'quick-notes-content': quickNotesContent,
  'quick-notes-editor-footer': quickNotesEditorFooter,
  'quick-notes-editor-footer-item': quickNotesEditorFooterItem,
  'quick-notes-empty-editor': quickNotesEmptyEditor,
} as const
