import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button, Input, Select, Slider, SpinnerIcon } from '@/shared/components/ui'
import { getErrorMessage } from '@/shared/lib/errorMessage'

import {
  getCompositionStatus,
  importCompositionFont,
  previewComposition,
  buildComposition,
  cancelComposition,
  resetComposition,
  chooseCompositionFont,
  saveComposition,
  type EnhancedStatus,
  type CompositionRequest,
} from '../api/compositionApi'
import { useCompositionFont } from '../hooks/useCompositionFont'
import { characterTypes, includesScope, setScope, sameComposition } from '../model/characterTypes'
import { FontSourceCard } from './FontSourceCard'

import { styles } from './EnhancedFontPanel.css'

export function EnhancedFontPanel({ actionsContainer }: { actionsContainer: HTMLDivElement | null }) {
  const [state, setState] = useState<EnhancedStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [error, setError] = useState('')
  const [savedPath, setSavedPath] = useState('')
  const [replacementScope, setReplacementScope] = useState(3)
  const [adjustmentScope, setAdjustmentScope] = useState(0)
  const [scalePercent, setScalePercent] = useState(100)
  const [weight, setWeight] = useState(0)
  const [samples, setSamples] = useState<Record<string, string>>(() =>
    Object.fromEntries(characterTypes.map((type) => [type.key, type.sample])),
  )
  const operation = useRef(false)
  const canceled = useRef(false)
  const status = state?.status
  const busy = loading || working || !!status?.busy
  const disabled = busy || !status?.available
  const draft = status?.draft
  const result = status?.result
  const request: CompositionRequest = {
    fontAId: state?.fontA?.id ?? '',
    fontBId: state?.fontB?.id ?? '',
    replacementScope,
    adjustmentScope,
    options: { scalePercent, weight },
  }
  const dirty = !sameComposition(state?.composition, request)
  const preview = useCompositionFont(draft?.id, false, busy)
  const supported = new Set(preview.points)
  const generated = !!result && result.draftId === draft?.id

  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      try {
        const next = await getCompositionStatus()
        if (disposed) return
        setState(next)
        setError(next.status.error)
        if (next.composition) {
          setReplacementScope(next.composition.replacementScope)
          setAdjustmentScope(next.composition.adjustmentScope)
          setScalePercent(next.composition.options.scalePercent)
          setWeight(next.composition.options.weight)
        }
        if (next.status.busy) timer = setTimeout(() => void refresh(), 1000)
        else setCanceling(false)
      } catch (cause) {
        if (!disposed) setError(getErrorMessage(cause, '无法读取增强工坊状态。'))
      } finally {
        if (!disposed) setLoading(false)
      }
    }
    void refresh()
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  async function run(action: () => Promise<unknown>) {
    if (disabled || operation.current) return
    operation.current = true
    canceled.current = false
    setWorking(true)
    setError('')
    setSavedPath('')
    try {
      await action()
      if (canceled.current) setError('已取消处理，已完成的有效预览和补丁仍可使用。')
    } catch (cause) {
      setError(
        canceled.current ? '已取消处理，上一次有效预览和补丁已保留。' : getErrorMessage(cause, '处理失败，请重试。'),
      )
    } finally {
      try {
        setState(await getCompositionStatus())
      } catch (cause) {
        setError(getErrorMessage(cause, '无法刷新状态，请重新进入增强页。'))
      }
      operation.current = false
      setWorking(false)
      setCanceling(false)
    }
  }
  function upload(slot: number) {
    void run(async () => {
      const path = await chooseCompositionFont(slot)
      if (path && !canceled.current) await importCompositionFont(slot, path)
    })
  }
  async function cancel() {
    if (canceling) return
    canceled.current = true
    setCanceling(true)
    try {
      await cancelComposition()
    } catch (cause) {
      canceled.current = false
      setCanceling(false)
      setError(getErrorMessage(cause, '取消失败，请重试。'))
    }
  }
  return (
    <div className={styles.root}>
      {actionsContainer &&
        createPortal(
          <>
            <Button
              variant='outline'
              disabled={disabled}
              onClick={() =>
                void run(async () => {
                  await resetComposition()
                  setReplacementScope(3)
                  setAdjustmentScope(0)
                  setScalePercent(100)
                  setWeight(0)
                })
              }
            >
              重置
            </Button>
            {busy && !loading && (
              <Button variant='outline' disabled={canceling} onClick={() => void cancel()}>
                {canceling ? '正在取消…' : '取消处理'}
              </Button>
            )}
          </>,
          actionsContainer,
        )}
      {!loading && !status?.available && (
        <p className={styles.feedback} role='status'>
          当前安装包缺少增强字体组件。
        </p>
      )}
      {(error || savedPath) && (
        <p className={styles.feedback} role='status'>
          {error || `已保存：${savedPath}`}
        </p>
      )}
      <div className={styles.fonts}>
        <FontSourceCard
          label='字体 A · 基础字体'
          font={state?.fontA ?? null}
          busy={disabled}
          onUpload={() => upload(0)}
        />
        <FontSourceCard
          label='字体 B · 替换字体'
          font={state?.fontB ?? null}
          busy={disabled}
          onUpload={() => upload(1)}
        />
      </div>
      <section className={styles.box} aria-label='字符组合设置'>
        <h2 className={styles.title}>选择每类字符的来源</h2>
        <div className={styles.toolbar}>
          <Button variant='outline' disabled={disabled} onClick={() => setReplacementScope(0)}>
            全部使用 A
          </Button>
          <Button variant='outline' disabled={disabled} onClick={() => setReplacementScope(16)}>
            全部使用 B
          </Button>
          <Button variant='outline' disabled={disabled} onClick={() => setAdjustmentScope(16)}>
            调整全部字符
          </Button>
          <Button variant='outline' disabled={disabled} onClick={() => setAdjustmentScope(0)}>
            清除调整范围
          </Button>
        </div>
        {characterTypes.map((type) => (
          <div className={styles.rule} key={type.key}>
            <div>
              <strong>{type.label}</strong>
              <p className={styles.hint}>{type.description}</p>
            </div>
            <Select
              aria-label={`${type.label}字体来源`}
              value={includesScope(replacementScope, type.bit) ? 'b' : 'a'}
              options={[
                { value: 'a', label: '字体 A' },
                { value: 'b', label: '字体 B' },
              ]}
              disabled={disabled}
              onValueChange={(value) => setReplacementScope(setScope(replacementScope, type.bit, value === 'b'))}
            />
            <Button
              variant={includesScope(adjustmentScope, type.bit) ? 'primary' : 'outline'}
              aria-pressed={includesScope(adjustmentScope, type.bit)}
              disabled={disabled}
              onClick={() =>
                setAdjustmentScope(setScope(adjustmentScope, type.bit, !includesScope(adjustmentScope, type.bit)))
              }
            >
              调整{type.label}
            </Button>
          </div>
        ))}
        <p className={styles.hint}>
          其他字符使用字体 {replacementScope === 16 ? 'B' : 'A'}；字体 B 缺少的字符保留字体
          A。调整范围独立于字体来源，修改参数不会立即执行。
        </p>
        <div className={styles.controls}>
          <div>
            <label className={styles.label} htmlFor='composition-scale'>
              <span>所选分类的字形大小</span>
              <output>{scalePercent}%</output>
            </label>
            <Slider
              id='composition-scale'
              aria-label='组合字形大小'
              min={80}
              max={125}
              step={1}
              value={scalePercent}
              disabled={disabled}
              onValueChange={setScalePercent}
            />
          </div>
          <div>
            <label className={styles.label} htmlFor='composition-weight'>
              <span>所选分类的笔画粗细</span>
              <output>{weight === 0 ? '原始' : weight > 0 ? `加粗 ${weight} 档` : `减细 ${-weight} 档`}</output>
            </label>
            <Slider
              id='composition-weight'
              aria-label='组合笔画粗细'
              min={-2}
              max={6}
              step={1}
              value={weight}
              disabled={disabled}
              onValueChange={setWeight}
            />
          </div>
        </div>
        <div className={styles.toolbar}>
          <Button
            disabled={disabled || !state?.fontA || !state.fontB || (!!draft && !dirty)}
            onClick={() => void run(() => previewComposition(request))}
          >
            <SpinnerIcon icon={RefreshCw} spinning={working} aria-hidden='true' />
            {draft ? '更新组合预览' : '预览组合效果'}
          </Button>
          <span className={styles.hint}>
            {draft && dirty ? '参数已改变，请先更新组合预览。' : '此步骤仅生成预览，不生成补丁。'}
          </span>
        </div>
      </section>
      {draft && (
        <section className={styles.box} aria-label='最终组合预览'>
          <h2 className={styles.title}>组合效果{dirty ? ' · 上一次预览' : ''}</h2>
          <p className={styles.hint}>
            替换 {state?.stats.replaced.toLocaleString()} 个字符 · 调整 {state?.stats.adjusted.toLocaleString()} 个字符
            · 保留 A 补缺 {state?.stats.fallback.toLocaleString()} 个字符 · GBK 覆盖{' '}
            {draft.gbkCoverage.covered.toLocaleString()} / {draft.gbkCoverage.total.toLocaleString()}
          </p>
          <div className={styles.previews}>
            {characterTypes.map((type) => (
              <div key={type.key}>
                <label className={styles.hint} htmlFor={`composition-sample-${type.key}`}>
                  {type.label}预览文字
                </label>
                <Input
                  id={`composition-sample-${type.key}`}
                  value={samples[type.key]}
                  maxLength={80}
                  onChange={(event) => setSamples({ ...samples, [type.key]: event.target.value })}
                />
                <p className={styles.sample} style={{ fontFamily: preview.family }}>
                  {preview.ready ? samples[type.key] : preview.error || '正在加载组合预览…'}
                </p>
                {preview.ready &&
                  [...samples[type.key]].some((char) => !/\s/u.test(char) && !supported.has(char.codePointAt(0)!)) && (
                    <p className={styles.hint}>此预览文字存在缺字，可能显示系统替代字体。</p>
                  )}
              </div>
            ))}
          </div>
          {preview.error && (
            <Button variant='outline' disabled={busy} onClick={preview.retry}>
              重试显示预览
            </Button>
          )}
          <div className={styles.toolbar}>
            <Button
              disabled={disabled || dirty || !preview.ready || generated}
              onClick={() => void run(() => buildComposition(draft.id, request))}
            >
              {generated ? '此组合已生成补丁' : '确认生成补丁'}
            </Button>
            {result && generated && !dirty && (
              <Button
                disabled={disabled}
                onClick={() =>
                  void run(async () => {
                    const path = await saveComposition(result)
                    if (path) setSavedPath(path)
                  })
                }
              >
                <Download aria-hidden='true' />
                下载补丁
              </Button>
            )}
          </div>
          <p className={styles.hint}>
            确认后封包当前预览字体。请使用覆盖 GBK 字符集的字体；游戏内的加载、字距和排版仍需实测。
          </p>
        </section>
      )}
    </div>
  )
}
