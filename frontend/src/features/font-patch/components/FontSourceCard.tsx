import { useState } from 'react'

import { Button, Select } from '@/shared/components/ui'

import type { SourceFont } from '../api/compositionApi'
import { useCompositionFont } from '../hooks/useCompositionFont'
import { characterKind, characterTypes, type CharacterKey } from '../model/characterTypes'

import { styles } from './FontSourceCard.css'

interface Props {
  label: string
  font: SourceFont | null
  busy: boolean
  onUpload: () => void
}
export function FontSourceCard({ label, font, busy, onUpload }: Props) {
  const preview = useCompositionFont(font?.id, true, busy)
  const [expanded, setExpanded] = useState(false)
  const [category, setCategory] = useState<CharacterKey | 'other'>('numbers')
  const [page, setPage] = useState(0)
  const points = preview.points.filter((point) => characterKind(point) === category)
  const pages = Math.max(1, Math.ceil(points.length / 80))
  const currentPage = Math.min(page, pages - 1)
  const supported = new Set(preview.points)
  return (
    <section className={styles.root} aria-label={label}>
      <div className={styles.header}>
        <h2 className={styles.title}>{label}</h2>
        <Button variant='outline' disabled={busy} onClick={onUpload}>
          {font ? '更换字体' : '上传字体'}
        </Button>
      </div>
      <p className={styles.hint}>
        {font
          ? `${font.name} · ${font.glyphCount.toLocaleString()} 个字形`
          : '选择 TTF / 静态 OTF，单文件不超过 64 MiB。'}
      </p>
      {font && <p className={styles.hint}>来源：{font.origin}</p>}
      {font && (
        <div className={styles.rows}>
          {characterTypes.map((type) => {
            const sample =
              [...type.sample].filter((char) => supported.has(char.codePointAt(0)!)).join('') ||
              preview.points
                .filter((point) => characterKind(point) === type.key)
                .slice(0, 12)
                .map((point) => String.fromCodePoint(point))
                .join('')
            const hasSample = !!font && preview.ready && !!sample
            return (
              <div className={styles.row} key={type.key}>
                <p className={styles.hint}>
                  {type.label} · {(font?.counts[type.key] ?? 0).toLocaleString()} 个字符
                </p>
                <p
                  className={hasSample ? styles.sample : styles.placeholder}
                  style={hasSample ? { fontFamily: preview.family } : undefined}
                >
                  {preview.ready ? sample || '此分类无字符' : preview.error || '正在加载字形…'}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {preview.error && (
        <Button disabled={busy} variant='outline' onClick={preview.retry}>
          重试字形预览
        </Button>
      )}
      {font && (
        <Button variant='outline' disabled={!preview.ready} onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起字形总览' : '展开字形总览'}
        </Button>
      )}
      {expanded && preview.ready && (
        <>
          <Select
            aria-label={`${label}字形分类`}
            value={category}
            onValueChange={(value) => {
              setCategory(value)
              setPage(0)
            }}
            options={[
              ...characterTypes.map((type) => ({ value: type.key, label: type.label })),
              { value: 'other', label: '其他字符' },
            ]}
          />
          <div className={styles.gallery} style={{ fontFamily: preview.family }}>
            {points.slice(currentPage * 80, (currentPage + 1) * 80).map((point) => (
              <span className={styles.glyph} key={point} title={`U+${point.toString(16).toUpperCase()}`}>
                {String.fromCodePoint(point)}
              </span>
            ))}
          </div>
          <div className={styles.toolbar}>
            <Button variant='outline' disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              上一页
            </Button>
            <span className={styles.hint}>
              {currentPage + 1} / {pages} · 共 {points.length.toLocaleString()} 个字符
            </span>
            <Button variant='outline' disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>
              下一页
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
