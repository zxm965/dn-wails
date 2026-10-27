import { style } from '@vanilla-extract/css'

const markdownPreview = style({
  minWidth: '0',
  minHeight: '0',
  overflowY: 'auto',
  padding: '18px 20px',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-body)',
  lineHeight: '1.75',
  overflowWrap: 'anywhere',
})

const markdownEmpty = style({
  color: 'var(--text-tertiary)',
  fontStyle: 'italic',
})

const markdownHeading = style({
  margin: '0 0 12px',
  color: 'var(--text-primary)',
  lineHeight: '1.35',
})

const markdownHeading1 = style([
  markdownHeading,
  {
    fontSize:
      'clamp(calc(24px + var(--font-size-heading-offset)), calc(3vw + var(--font-size-heading-offset)), calc(32px + var(--font-size-heading-offset)))',
  },
])

const markdownHeading2 = style([
  markdownHeading,
  {
    paddingBottom: '6px',
    fontSize:
      'clamp(calc(20px + var(--font-size-heading-offset)), 2.5vw, calc(26px + var(--font-size-heading-offset)))',
    borderBottom: '1px solid var(--border-subtle)',
  },
])

const markdownHeading3 = style([
  markdownHeading,
  {
    fontSize: 'calc(20px + var(--font-size-heading-offset))',
  },
])

const markdownHeading4 = style([
  markdownHeading,
  {
    fontSize: 'var(--font-size-title)',
  },
])

const markdownHeading5 = style([
  markdownHeading,
  {
    fontSize: 'var(--font-size-subtitle)',
  },
])

const markdownHeading6 = style([
  markdownHeading,
  {
    color: 'var(--text-secondary)',
    fontSize: 'var(--font-size-body)',
  },
])

const markdownParagraph = style({
  margin: '0 0 14px',
  whiteSpace: 'pre-wrap',
})

const markdownList = style({
  display: 'grid',
  gap: '6px',
  margin: '0 0 14px',
  paddingLeft: '24px',
})

const markdownListItem = style({
  paddingLeft: '4px',
})

const markdownBlockquote = style({
  margin: '0 0 14px',
  padding: '10px 14px',
  color: 'var(--text-secondary)',
  background: 'var(--surface-muted)',
  borderLeft: '3px solid var(--accent)',
  borderRadius: '0 var(--control-radius) var(--control-radius) 0',
})

const markdownCodeBlock = style({
  margin: '0 0 14px',
  padding: '14px 16px',
  overflowX: 'auto',
  color: 'var(--text-primary)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 'var(--font-size-secondary)',
  lineHeight: '1.65',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--control-radius)',
})

const markdownInlineCode = style({
  padding: '2px 5px',
  color: 'var(--accent-strong)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '0.9em',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '4px',
})

const markdownLink = style({
  color: 'var(--accent-strong)',
  textDecoration: 'underline',
  textDecorationColor: 'color-mix(in srgb, var(--accent) 45%, transparent)',
  textUnderlineOffset: '2px',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      textDecorationColor: 'currentColor',
    },
    '&:focus-visible': {
      outline: '2px solid var(--focus-ring)',
      outlineOffset: '2px',
      borderRadius: '2px',
    },
  },
})

const markdownDivider = style({
  margin: '4px 0 18px',
  border: '0',
  borderTop: '1px solid var(--border-subtle)',
})

export const styles = {
  'markdown-preview': markdownPreview,
  'markdown-empty': markdownEmpty,
  'markdown-heading-1': markdownHeading1,
  'markdown-heading-2': markdownHeading2,
  'markdown-heading-3': markdownHeading3,
  'markdown-heading-4': markdownHeading4,
  'markdown-heading-5': markdownHeading5,
  'markdown-heading-6': markdownHeading6,
  'markdown-paragraph': markdownParagraph,
  'markdown-list': markdownList,
  'markdown-list-item': markdownListItem,
  'markdown-blockquote': markdownBlockquote,
  'markdown-code-block': markdownCodeBlock,
  'markdown-inline-code': markdownInlineCode,
  'markdown-link': markdownLink,
  'markdown-divider': markdownDivider,
} as const
