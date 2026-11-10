import { Check, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import { Button, Input, Slider, SpinnerIcon, Textarea } from '@/shared/components/ui'
import { getErrorMessage } from '@/shared/lib/errorMessage'

import { getFontPatchPreview, type FontPatchDraft, type FontPatchOptions } from '../api/fontPatchApi'

import { styles } from './FontPreview.css'

interface FontPreviewProps {
  draft: FontPatchDraft
  options: FontPatchOptions
  busy: boolean
  locked: boolean
  dirty: boolean
  adjustmentFailed: boolean
  building: boolean
  confirmed: boolean
  onOptionsChange: (options: FontPatchOptions) => void
  onConfirm: () => void
}

export function FontPreview({
  draft,
  options,
  busy,
  locked,
  dirty,
  adjustmentFailed,
  building,
  confirmed,
  onOptionsChange,
  onConfirm,
}: FontPreviewProps) {
  const textId = useId()
  const sizeId = useId()
  const [sample, setSample] = useState('龙之谷 · 冒险从这里开始\nDragon Nest  Aa Bb  0123456789')
  const [displaySize, setDisplaySize] = useState(24)
  const [loaded, setLoaded] = useState<{ id: string; family: string } | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const ready = loaded?.id === draft.id
  const loadError = failure?.id === draft.id ? failure.message : ''

  useEffect(() => {
    if (busy) return
    let disposed = false
    let face: FontFace | undefined
    async function load() {
      setLoaded(null)
      setFailure(null)
      try {
        const preview = await getFontPatchPreview(draft.id)
        if (disposed) return
        const bytes = Uint8Array.from(atob(preview.data), (char) => char.charCodeAt(0))
        const family = `Workshop-${draft.id}`
        face = new FontFace(family, bytes.buffer)
        await face.load()
        if (disposed) return
        document.fonts.add(face)
        setLoaded({ id: draft.id, family })
        setFailure(null)
      } catch (cause) {
        if (!disposed) setFailure({ id: draft.id, message: getErrorMessage(cause, '无法显示此字体的预览。') })
      }
    }
    void load()
    return () => {
      disposed = true
      if (face) document.fonts.delete(face)
    }
  }, [draft.id, retry, busy])

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <div className={styles.control}>
          <div className={styles.label}>
            <span>字形大小</span>
            <output>{options.scalePercent}%</output>
          </div>
          <Slider
            aria-label='补丁字形大小'
            min={80}
            max={125}
            step={1}
            value={options.scalePercent}
            disabled={locked}
            onValueChange={(scalePercent) => onOptionsChange({ ...options, scalePercent })}
          />
        </div>
        <div className={styles.control}>
          <div className={styles.label}>
            <span>笔画粗细</span>
            <output>
              {options.weight === 0
                ? '原始'
                : options.weight > 0
                  ? `加粗 ${options.weight} 档`
                  : `减细 ${-options.weight} 档`}
            </output>
          </div>
          <Slider
            aria-label='补丁笔画粗细'
            min={-2}
            max={6}
            step={1}
            value={options.weight}
            disabled={locked}
            onValueChange={(weight) => onOptionsChange({ ...options, weight })}
          />
        </div>
        <Button
          variant='outline'
          disabled={locked || (options.scalePercent === 100 && options.weight === 0)}
          onClick={() => onOptionsChange({ scalePercent: 100, weight: 0 })}
        >
          <RotateCcw aria-hidden='true' />
          恢复原始
        </Button>
      </div>
      <div className={styles.editorHeader}>
        <label htmlFor={textId}>预览文字</label>
        <label className={styles.displaySize} htmlFor={sizeId}>
          预览基准字号
          <Input
            id={sizeId}
            className={styles.sizeInput}
            type='number'
            min={12}
            max={48}
            value={displaySize}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber
              if (Number.isFinite(value)) setDisplaySize(Math.max(12, Math.min(48, value)))
            }}
          />
          px
        </label>
      </div>
      <Textarea
        id={textId}
        value={sample}
        maxLength={300}
        rows={2}
        className={styles.textInput}
        onChange={(event) => setSample(event.target.value)}
        aria-label='编辑预览文字'
      />
      <div className={styles.sample} aria-busy={busy || (!adjustmentFailed && !loadError && (!ready || dirty))}>
        {ready && !busy && !dirty ? (
          <p className={styles.rendered} style={{ fontFamily: `"${loaded.family}"`, fontSize: displaySize }}>
            {sample || '龙之谷 Dragon Nest 0123456789'}
          </p>
        ) : (
          <p className={styles.status} role='status'>
            {adjustmentFailed && !busy
              ? '调整未完成，请重试调整或恢复原始效果。'
              : loadError && !busy && !dirty
                ? loadError
                : '正在更新字体预览…'}
          </p>
        )}
      </div>
      {loadError && !busy && !dirty && (
        <Button
          variant='outline'
          onClick={() => {
            setFailure(null)
            setRetry((value) => value + 1)
          }}
        >
          <RefreshCw aria-hidden='true' />
          重试显示
        </Button>
      )}
      <div className={styles.footer}>
        <p className={styles.hint}>
          调整只更新预览，确认后才生成补丁。预览基准字号仅用于查看；游戏内实际字号和裁切效果仍需实测。
        </p>
        <Button disabled={locked || busy || dirty || !ready || confirmed} onClick={onConfirm}>
          <SpinnerIcon icon={Check} spinning={building} aria-hidden='true' />
          {building ? '正在生成补丁…' : confirmed ? '当前预览已生成补丁' : '确认生成补丁'}
        </Button>
      </div>
    </div>
  )
}
