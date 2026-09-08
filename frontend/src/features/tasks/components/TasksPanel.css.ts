import { style } from '@vanilla-extract/css'

const isActive = style({})
const isCompleted = style({})
const isStarred = style({})
const isSubtask = style({})

const tasksPage = style({
  width: 'min(100%, var(--page-content-max-width))',
  minWidth: '0',
  display: 'grid',
  gap: '18px',
  margin: '0 auto',
  padding: 'var(--page-padding-start) var(--page-padding-inline) var(--page-padding-end)',
  containerName: 'tasks-page',
  containerType: 'inline-size',
})

const tasksWorkspace = style([
  {
    minWidth: '0',
    height: 'clamp(510px, calc(100vh - 220px), 780px)',
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 0.28fr) minmax(0, 1fr)',
    overflow: 'hidden',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--surface-shadow)',
  },
  {
    '@container': {
      'tasks-page (max-width: 720px)': {
        height: 'auto',
        gridTemplateColumns: 'minmax(0, 1fr)',
      },
    },
    '@media': {
      print: {
        height: 'auto',
        display: 'block',
        overflow: 'visible',
        border: '0',
        boxShadow: 'none',
      },
    },
  },
])

const tasksListsPanel = style([
  {
    minWidth: '0',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '14px 10px',
    background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--accent) 8%)',
    borderRight: '1px solid var(--border-subtle)',
  },
  {
    '@container': {
      'tasks-page (max-width: 720px)': {
        maxHeight: '240px',
        borderRight: '0',
        borderBottom: '1px solid var(--border-subtle)',
      },
    },
    '@media': {
      print: { display: 'none' },
    },
  },
])

const tasksListsHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '0 6px 7px',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  letterSpacing: '0.04em',
})

const tasksLists = style({
  minHeight: '0',
  display: 'grid',
  alignContent: 'start',
  gap: '4px',
  padding: '2px 5px 2px 2px',
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollPaddingBlock: '2px',
})

const tasksListRow = style({
  position: 'relative',
  minWidth: '0',
  zIndex: '0',
  selectors: {
    '&:hover': {
      zIndex: '2',
    },
  },
})

const tasksListButton = style({
  width: '100%',
  minWidth: '0',
  justifyContent: 'flex-start',
  paddingInline: '10px',
  transition: 'background 150ms ease, border-color 150ms ease',
  selectors: {
    [`&${isActive}`]: {
      color: 'var(--text-primary)',
      background: 'var(--accent-muted)',
      borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

const tasksListLabel = style({
  minWidth: '0',
  flex: '1',
  overflow: 'hidden',
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const tasksListCount = style({
  flex: '0 0 auto',
  color: 'var(--text-tertiary)',
  fontSize: '9px',
})

const tasksListActionTrigger = style({
  position: 'absolute',
  top: '50%',
  right: '4px',
  zIndex: '1',
  width: '28px',
  padding: '0',
  opacity: '0',
  visibility: 'hidden',
  pointerEvents: 'none',
  color: 'var(--text-secondary)',
  background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--surface-muted) 8%)',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(17, 27, 41, 0.08)',
  transform: 'translate(4px, -50%)',
  transition: 'opacity 130ms ease, transform 130ms ease, visibility 130ms ease',
  selectors: {
    [`${tasksListRow}:hover &`]: {
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      transform: 'translate(0, -50%)',
    },
    [`${tasksListRow}:focus-within &`]: {
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      transform: 'translate(0, -50%)',
    },
    '&[data-popup-open]': {
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      color: 'var(--text-primary)',
      background: 'var(--surface-hover)',
      transform: 'translate(0, -50%)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
    '(hover: none)': {
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      transform: 'translate(0, -50%)',
    },
  },
})

const tasksListActionsPositioner = style({
  zIndex: '1200',
  outline: 'none',
})

const tasksListActionsPopup = style({
  padding: '3px',
  background: 'color-mix(in srgb, var(--surface-elevated) 96%, var(--surface-muted) 4%)',
  border: '1px solid var(--border-strong)',
  borderRadius: '11px',
  boxShadow: '0 10px 28px rgba(17, 27, 41, 0.16)',
  backdropFilter: 'blur(12px)',
  transformOrigin: 'var(--transform-origin)',
  transition: 'opacity 120ms ease, transform 120ms ease',
  selectors: {
    '&[data-starting-style], &[data-ending-style]': {
      opacity: '0',
      transform: 'scale(0.96)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
})

const tasksListActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
})

const tasksListActionButton = style({
  width: '28px',
  padding: '0',
  color: 'var(--text-secondary)',
  borderRadius: '8px',
  selectors: {
    '&:hover': {
      color: 'var(--text-primary)',
      background: 'var(--surface-hover)',
    },
    '&:focus-visible': {
      color: 'var(--text-primary)',
    },
  },
})

const tasksMain = style({
  minWidth: '0',
  minHeight: '0',
  display: 'flex',
  flexDirection: 'column',
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 97%, var(--accent) 3%) 0%, var(--surface-elevated) 46%)',
})

const tasksMainHeader = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    margin: '12px 12px 0',
    padding: '15px 16px',
    background: 'color-mix(in srgb, var(--surface-elevated) 92%, var(--accent) 8%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(17, 27, 41, 0.06)',
  },
  {
    '@container': {
      'tasks-page (max-width: 560px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
  },
])

const tasksMainTitle = style({
  minWidth: '0',
  display: 'grid',
  gap: '4px',
})

const tasksMainHeading = style({
  margin: '0',
  overflow: 'hidden',
  fontSize: '18px',
  lineHeight: '1.25',
  letterSpacing: '-0.02em',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const tasksMainSummary = style({
  color: 'var(--text-tertiary)',
  fontSize: '11px',
  fontWeight: '650',
})

const tasksToolbar = style([
  {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  {
    '@container': {
      'tasks-page (max-width: 560px)': {
        alignItems: 'stretch',
        flexDirection: 'column',
      },
    },
    '@media': {
      print: { display: 'none' },
    },
  },
])

const tasksSearch = style({
  position: 'relative',
  minWidth: '170px',
})

const tasksSearchIcon = style({
  position: 'absolute',
  top: '50%',
  left: '11px',
  zIndex: '1',
  width: '15px',
  height: '15px',
  color: 'var(--text-tertiary)',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
})

const tasksSearchInput = style({
  width: '100%',
  paddingLeft: '34px',
  background: 'color-mix(in srgb, var(--surface-muted) 82%, transparent)',
  borderRadius: '11px',
})

const tasksSortSelect = style({
  background: 'color-mix(in srgb, var(--surface-muted) 82%, transparent)',
  borderRadius: '11px',
})

const tasksQuickAdd = style([
  {
    minWidth: '0',
    display: 'grid',
    gridTemplateColumns: '18px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '9px',
    margin: '10px 12px 6px',
    padding: '8px 8px 8px 12px',
    background: 'color-mix(in srgb, var(--surface-elevated) 94%, var(--accent) 6%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
    boxShadow: '0 8px 24px rgba(17, 27, 41, 0.05)',
  },
  {
    '@media': {
      print: { display: 'none' },
    },
  },
])

const tasksScroll = style({
  minWidth: '0',
  minHeight: '0',
  flex: '1',
  overflowY: 'auto',
  padding: '8px 12px 16px',
  overscrollBehavior: 'contain',
  '@media': {
    print: { overflow: 'visible' },
  },
})

const tasksItems = style({
  display: 'grid',
  gap: '8px',
})

const tasksItemGroup = style({
  minWidth: '0',
  selectors: {
    [`&${isSubtask}`]: {
      position: 'relative',
    },
  },
})

const tasksItem = style({
  minWidth: '0',
  display: 'grid',
  gridTemplateColumns: '30px minmax(0, 1fr) repeat(3, 30px)',
  alignItems: 'center',
  gap: '4px',
  padding: '9px 10px',
  background: 'color-mix(in srgb, var(--surface-muted) 76%, var(--surface-elevated) 24%)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  boxShadow: '0 7px 18px rgba(17, 27, 41, 0.045)',
  transition: 'border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease',
  selectors: {
    '&:hover': {
      background: 'color-mix(in srgb, var(--surface-muted) 86%, var(--accent) 14%)',
      borderColor: 'color-mix(in srgb, var(--accent) 24%, var(--border-subtle))',
      boxShadow: '0 10px 26px rgba(17, 27, 41, 0.08)',
      transform: 'translateY(-1px)',
    },
    '&:focus-within': {
      borderColor: 'var(--focus-ring)',
    },
    [`&${isCompleted}`]: {
      opacity: '0.68',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
})

const tasksCompleteButton = style({
  width: '30px',
  padding: '0',
  color: 'var(--accent)',
  borderRadius: '10px',
})

const tasksItemContent = style({
  minWidth: '0',
  height: 'auto',
  minHeight: '36px',
  display: 'grid',
  justifyItems: 'start',
  alignContent: 'center',
  gap: '3px',
  padding: '2px 6px',
  overflow: 'hidden',
  textAlign: 'left',
  whiteSpace: 'normal',
})

const tasksItemTitle = style({
  maxWidth: '100%',
  overflow: 'hidden',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: '750',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    [`${tasksItem}${isCompleted} &`]: {
      textDecoration: 'line-through',
    },
  },
})

const tasksItemMeta = style({
  width: '100%',
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  overflow: 'hidden',
  color: 'var(--text-tertiary)',
  fontSize: '10px',
  whiteSpace: 'nowrap',
})

const tasksIconButton = style({
  width: '30px',
  padding: '0',
  borderRadius: '10px',
  selectors: {
    [`&${isStarred}`]: {
      color: '#f1a900',
    },
  },
})

const tasksSubtasks = style({
  display: 'grid',
  gap: '5px',
  margin: '5px 0 0 32px',
  paddingLeft: '12px',
  borderLeft: '2px solid color-mix(in srgb, var(--accent) 24%, var(--border-subtle))',
})

const tasksEmpty = style({
  minHeight: '280px',
})

const tasksCompleted = style({
  display: 'grid',
  gap: '8px',
  marginTop: '16px',
  padding: '12px',
  background: 'color-mix(in srgb, var(--surface-muted) 48%, transparent)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
})

const tasksCompletedHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
})

const tasksListDialogField = style({
  display: 'grid',
  gap: '7px',
})

const tasksListDialogFooter = style({
  justifyContent: 'space-between',
})

const tasksListDialogActions = style({
  display: 'flex',
  gap: '8px',
})

const overdue = style({
  color: 'var(--danger-text)',
})

export const styles = {
  'tasks-page': tasksPage,
  'tasks-workspace': tasksWorkspace,
  'tasks-lists-panel': tasksListsPanel,
  'tasks-lists-header': tasksListsHeader,
  'tasks-lists': tasksLists,
  'tasks-list-row': tasksListRow,
  'tasks-list-button': tasksListButton,
  'tasks-list-label': tasksListLabel,
  'tasks-list-count': tasksListCount,
  'tasks-list-action-trigger': tasksListActionTrigger,
  'tasks-list-actions-positioner': tasksListActionsPositioner,
  'tasks-list-actions-popup': tasksListActionsPopup,
  'tasks-list-actions': tasksListActions,
  'tasks-list-action-button': tasksListActionButton,
  'tasks-main': tasksMain,
  'tasks-main-header': tasksMainHeader,
  'tasks-main-title': tasksMainTitle,
  'tasks-main-heading': tasksMainHeading,
  'tasks-main-summary': tasksMainSummary,
  'tasks-toolbar': tasksToolbar,
  'tasks-search': tasksSearch,
  'tasks-search-icon': tasksSearchIcon,
  'tasks-search-input': tasksSearchInput,
  'tasks-sort-select': tasksSortSelect,
  'tasks-quick-add': tasksQuickAdd,
  'tasks-scroll': tasksScroll,
  'tasks-items': tasksItems,
  'tasks-item-group': tasksItemGroup,
  'tasks-item': tasksItem,
  'tasks-complete-button': tasksCompleteButton,
  'tasks-item-content': tasksItemContent,
  'tasks-item-title': tasksItemTitle,
  'tasks-item-meta': tasksItemMeta,
  'tasks-icon-button': tasksIconButton,
  'tasks-subtasks': tasksSubtasks,
  'tasks-empty': tasksEmpty,
  'tasks-completed': tasksCompleted,
  'tasks-completed-header': tasksCompletedHeader,
  'tasks-list-dialog-field': tasksListDialogField,
  'tasks-list-dialog-footer': tasksListDialogFooter,
  'tasks-list-dialog-actions': tasksListDialogActions,
  'is-active': isActive,
  'is-completed': isCompleted,
  'is-starred': isStarred,
  'is-subtask': isSubtask,
  'is-overdue': overdue,
} as const
