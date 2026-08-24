import { Fragment, type ElementType, type MouseEvent, type ReactNode } from 'react'

import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './MarkdownPreview.css'

const cx = createScopedClassNames(styles)

export interface MarkdownPreviewProps {
  content: string
  className?: string
  onOpenLink?: (url: string) => void
}

function safeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

function renderInline(value: string, keyPrefix: string, onOpenLink?: (url: string) => void): ReactNode[] {
  const tokens =
    /(`+[^`]*`+|\[[^\]]+\]\([^\s)]+(?:\s+"[^"]*")?\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_)/g
  const result: ReactNode[] = []
  let cursor = 0
  let tokenIndex = 0

  for (const match of value.matchAll(tokens)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > cursor) {
      result.push(<Fragment key={`${keyPrefix}-text-${tokenIndex++}`}>{value.slice(cursor, index)}</Fragment>)
    }

    if (token.startsWith('`')) {
      result.push(
        <code key={`${keyPrefix}-code-${tokenIndex++}`} className={cx('markdown-inline-code')}>
          {token.replace(/^`+|`+$/g, '')}
        </code>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)$/)
      const rawUrl = linkMatch?.[2]
      const url = rawUrl ? safeUrl(rawUrl) : null
      if (linkMatch && url) {
        const safeLink = url

        function openLink(event: MouseEvent<HTMLAnchorElement>) {
          if (!onOpenLink) return
          event.preventDefault()
          onOpenLink(safeLink)
        }

        result.push(
          <a
            key={`${keyPrefix}-link-${tokenIndex++}`}
            className={cx('markdown-link')}
            href={safeLink}
            rel='noreferrer'
            target='_blank'
            onClick={openLink}
          >
            {renderInline(linkMatch[1], `${keyPrefix}-link-label-${tokenIndex}`, onOpenLink)}
          </a>,
        )
      } else {
        result.push(<Fragment key={`${keyPrefix}-text-${tokenIndex++}`}>{token}</Fragment>)
      }
    } else if (token.startsWith('**') || token.startsWith('__')) {
      result.push(
        <strong key={`${keyPrefix}-strong-${tokenIndex++}`}>
          {renderInline(token.slice(2, -2), `${keyPrefix}-strong-${tokenIndex}`, onOpenLink)}
        </strong>,
      )
    } else if (token.startsWith('~~')) {
      result.push(
        <del key={`${keyPrefix}-del-${tokenIndex++}`}>
          {renderInline(token.slice(2, -2), `${keyPrefix}-del-${tokenIndex}`, onOpenLink)}
        </del>,
      )
    } else {
      result.push(
        <em key={`${keyPrefix}-em-${tokenIndex++}`}>
          {renderInline(token.slice(1, -1), `${keyPrefix}-em-${tokenIndex}`, onOpenLink)}
        </em>,
      )
    }

    cursor = index + token.length
  }

  if (cursor < value.length) {
    result.push(<Fragment key={`${keyPrefix}-text-${tokenIndex}`}>{value.slice(cursor)}</Fragment>)
  }

  return result
}

function isBlockStart(line: string): boolean {
  return /^(?:\s{0,3}(?:#{1,6}\s+|>|[-*+]\s+|\d+\.\s+|```)|\s{0,3}(?:---+|\*\s*\*\s*\*))/.test(line)
}

function renderBlocks(content: string, onOpenLink?: (url: string) => void): ReactNode[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  let blockIndex = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fenceMatch = line.match(/^\s{0,3}```\s*([\w-]*)\s*$/)
    if (fenceMatch) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !/^\s{0,3}```\s*$/.test(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(
        <pre key={`block-${blockIndex++}`} className={cx('markdown-code-block')}>
          <code data-language={fenceMatch[1] || undefined}>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const headingClass = cx(`markdown-heading-${level}`)
      const Heading = `h${level}` as ElementType
      blocks.push(
        <Heading key={`block-${blockIndex++}`} className={headingClass}>
          {renderInline(headingMatch[2], `block-${blockIndex}`, onOpenLink)}
        </Heading>,
      )
      index += 1
      continue
    }

    if (/^\s{0,3}(?:---+|\*\s*\*\s*\*)\s*$/.test(line)) {
      blocks.push(<hr key={`block-${blockIndex++}`} className={cx('markdown-divider')} />)
      index += 1
      continue
    }

    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s{0,3}>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''))
        index += 1
      }
      blocks.push(
        <blockquote key={`block-${blockIndex++}`} className={cx('markdown-blockquote')}>
          {renderInline(quoteLines.join('\n'), `block-${blockIndex}`, onOpenLink)}
        </blockquote>,
      )
      continue
    }

    const unorderedMatch = line.match(/^\s{0,3}[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      const items: string[] = []
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s{0,3}[-*+]\s+(.+)$/)
        if (!itemMatch) break
        items.push(itemMatch[1])
        index += 1
      }
      blocks.push(
        <ul key={`block-${blockIndex++}`} className={cx('markdown-list')}>
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`} className={cx('markdown-list-item')}>
              {renderInline(item, `block-${blockIndex}-item-${itemIndex}`, onOpenLink)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    const orderedMatch = line.match(/^\s{0,3}\d+\.\s+(.+)$/)
    if (orderedMatch) {
      const items: string[] = []
      let start = Number(line.match(/^\s{0,3}(\d+)\./)?.[1] ?? 1)
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s{0,3}\d+\.\s+(.+)$/)
        if (!itemMatch) break
        items.push(itemMatch[1])
        index += 1
      }
      blocks.push(
        <ol key={`block-${blockIndex++}`} className={cx('markdown-list')} start={start}>
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`} className={cx('markdown-list-item')}>
              {renderInline(item, `block-${blockIndex}-item-${itemIndex}`, onOpenLink)}
            </li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push(
      <p key={`block-${blockIndex++}`} className={cx('markdown-paragraph')}>
        {paragraphLines.flatMap((paragraphLine, lineIndex) => [
          lineIndex > 0 ? <br key={`break-${lineIndex}`} /> : null,
          ...renderInline(paragraphLine, `block-${blockIndex}-line-${lineIndex}`, onOpenLink),
        ])}
      </p>,
    )
  }

  return blocks
}

export function MarkdownPreview({ content, className, onOpenLink }: MarkdownPreviewProps) {
  const normalizedContent = content.trim()
  return (
    <article className={cx('markdown-preview', className)} aria-label='笔记预览'>
      {normalizedContent ? (
        renderBlocks(normalizedContent, onOpenLink)
      ) : (
        <p className={cx('markdown-empty')}>暂无内容，点击编辑开始记录。</p>
      )}
    </article>
  )
}
