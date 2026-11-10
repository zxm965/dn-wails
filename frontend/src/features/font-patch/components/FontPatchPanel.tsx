import { CheckCircle2, Download, FileType2, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { Button, Card, CardContent, PageHeader, SpinnerIcon } from '@/shared/components/ui'
import { getErrorMessage } from '@/shared/lib/errorMessage'
import { subscribeFileDrop } from '@/shared/native-kit'

import {
  buildFontPatch,
  cancelFontPatch,
  getFontPatchStatus,
  pickFont,
  saveFontPatch,
  resetFontPatch,
  type FontPatchResult,
  type FontPatchDraft,
  type FontPatchOptions,
  prepareFontPatch,
  adjustFontPatch,
} from '../api/fontPatchApi'
import { getFontDisplayName } from '../model/fontName'
import { FontPreview } from './FontPreview'

import { styles } from './FontPatchPanel.css'

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

export function FontPatchPanel() {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [building, setBuilding] = useState(false)
  const [draft, setDraft] = useState<FontPatchDraft | null>(null)
  const [options, setOptions] = useState<FontPatchOptions>({ scalePercent: 100, weight: 0 })
  const [failedAdjustment, setFailedAdjustment] = useState('')
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [result, setResult] = useState<FontPatchResult | null>(null)
  const [error, setError] = useState('')
  const [savedPath, setSavedPath] = useState('')
  const operation = useRef(false)
  const pendingTask = useRef<{ cancelRequested: boolean } | null>(null)
  const dropArea = useRef<HTMLDivElement>(null)
  const dirty =
    !!draft && (options.scalePercent !== draft.options.scalePercent || options.weight !== draft.options.weight)
  const adjustmentKey = draft ? `${draft.id}:${options.scalePercent}:${options.weight}` : ''
  const disabled = loading || !available || busy || picking || saving || resetting

  // Recover the backend task/result when navigating away and back. Polling is
  // scoped to a pending build and is always stopped on unmount.
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      try {
        const status = await getFontPatchStatus()
        if (disposed) return
        setAvailable(status.available)
        setBusy(status.busy)
        setBuilding(status.phase === 'build')
        if (status.busy) pendingTask.current ??= { cancelRequested: false }
        else {
          pendingTask.current = null
          setCanceling(false)
        }
        if (status.error) setError(status.error)
        if (status.result) setResult(status.result)
        if (status.draft) {
          setDraft(status.draft)
          setOptions(status.draft.options)
        }
        if (status.busy) timer = setTimeout(() => void refresh(), 1000)
      } catch (cause) {
        if (!disposed) setError(getErrorMessage(cause, '无法读取字体工具状态。'))
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

  async function prepare(path: string) {
    setError('')
    if (!/\.(ttf|otf)$/i.test(path)) {
      setError('请选择 TTF 或静态 OTF 字体文件。')
      return
    }
    const task = { cancelRequested: false }
    pendingTask.current = task
    setBusy(true)
    setSavedPath('')
    try {
      const initialOptions = { scalePercent: 100, weight: 0 }
      const prepared = await prepareFontPatch(path, initialOptions)
      setDraft(prepared)
      setOptions(initialOptions)
      setFailedAdjustment('')
      setResult(null)
    } catch (cause) {
      if (task.cancelRequested && draft) {
        setOptions(draft.options)
        setFailedAdjustment('')
      }
      setError(
        task.cancelRequested
          ? '已取消处理，可重新上传字体。'
          : getErrorMessage(cause, '字体预览失败，请检查字体文件后重试。'),
      )
    } finally {
      pendingTask.current = null
      setBusy(false)
      setCanceling(false)
    }
  }

  useEffect(() => {
    if (!draft || !dirty || busy || disabled || failedAdjustment === adjustmentKey) return
    const timer = setTimeout(() => {
      if (operation.current) return
      operation.current = true
      const task = { cancelRequested: false }
      pendingTask.current = task
      setBusy(true)
      setError('')
      setSavedPath('')
      void adjustFontPatch(draft.id, options)
        .then((next) => {
          setDraft(next)
          setFailedAdjustment('')
          if (task.cancelRequested) setOptions(next.options)
        })
        .catch((cause: unknown) => {
          if (task.cancelRequested) {
            // Discard queued slider changes as well as the canceled adjustment.
            setOptions(draft.options)
            setFailedAdjustment('')
            setError('已取消调整，已恢复上一次预览。')
          } else {
            setError(getErrorMessage(cause, '预览调整失败，请减小调整幅度后重试。'))
            setFailedAdjustment(adjustmentKey)
          }
        })
        .finally(() => {
          pendingTask.current = null
          operation.current = false
          setBusy(false)
          setCanceling(false)
        })
    }, 350)
    return () => clearTimeout(timer)
  }, [draft, dirty, busy, disabled, options, failedAdjustment, adjustmentKey])

  async function confirm() {
    if (!draft || dirty || disabled || operation.current) return
    operation.current = true
    const task = { cancelRequested: false }
    pendingTask.current = task
    setBusy(true)
    setBuilding(true)
    setError('')
    setSavedPath('')
    try {
      setResult(await buildFontPatch(draft.id))
    } catch (cause) {
      setError(
        task.cancelRequested
          ? '已取消生成，预览已保留，可重新确认生成。'
          : getErrorMessage(cause, '补丁生成失败，请重试。'),
      )
    } finally {
      pendingTask.current = null
      operation.current = false
      setBusy(false)
      setBuilding(false)
      setCanceling(false)
    }
  }

  async function upload() {
    if (disabled || operation.current) return
    operation.current = true
    setPicking(true)
    setError('')
    try {
      const path = await pickFont()
      setPicking(false)
      if (path) await prepare(path)
    } catch (cause) {
      setError(getErrorMessage(cause, '无法打开字体文件。'))
    } finally {
      setPicking(false)
      operation.current = false
    }
  }

  const onDrop = useEffectEvent(async (position: { x: number; y: number }, paths: string[]) => {
    const area = dropArea.current?.getBoundingClientRect()
    if (!area || position.x < area.left || position.x > area.right || position.y < area.top || position.y > area.bottom)
      return
    if (disabled || operation.current) return
    if (paths.length !== 1) {
      setError('每次请上传一个字体文件。')
      return
    }
    operation.current = true
    try {
      await prepare(paths[0])
    } finally {
      operation.current = false
    }
  })

  useEffect(() => subscribeFileDrop((position, paths) => void onDrop(position, paths)), [])

  async function save() {
    if (!result || disabled || operation.current) return
    operation.current = true
    setSaving(true)
    setError('')
    try {
      const path = await saveFontPatch(result)
      if (path) setSavedPath(path)
    } catch (cause) {
      setError(getErrorMessage(cause, '保存失败，请选择其他位置后重试。'))
    } finally {
      setSaving(false)
      operation.current = false
    }
  }

  async function reset() {
    if (disabled || operation.current) return
    operation.current = true
    setResetting(true)
    try {
      await resetFontPatch()
      setResult(null)
      setDraft(null)
      setOptions({ scalePercent: 100, weight: 0 })
      setFailedAdjustment('')
      setError('')
      setSavedPath('')
      setCanceling(false)
    } catch (cause) {
      setError(getErrorMessage(cause, '重置失败，请稍后重试。'))
    } finally {
      setResetting(false)
      operation.current = false
    }
  }

  async function cancel() {
    const task = pendingTask.current
    if (!task || task.cancelRequested) return
    task.cancelRequested = true
    setCanceling(true)
    try {
      await cancelFontPatch()
      // Keep the cancellation state until the running request (or recovery
      // polling) completes; acknowledging cancel does not mean work has stopped.
    } catch (cause) {
      if (pendingTask.current !== task) return
      task.cancelRequested = false
      setCanceling(false)
      setError(getErrorMessage(cause, '取消失败，请稍后重试。'))
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title='工坊' subtitle='上传字体预览并调整效果，确认后生成龙之谷字体补丁。' />
      <Card className={styles.card}>
        <CardContent>
          <div className={styles.upload} ref={dropArea} data-file-drop-target aria-busy={busy}>
            <FileType2 className={styles.icon} aria-hidden='true' />
            <div className={styles.uploadCopy}>
              <h2 className={styles.title}>字体补丁</h2>
              <p className={styles.description}>选择或拖入 TTF / 静态 OTF，先预览，确认后生成。</p>
            </div>
            <div className={styles.uploadActions}>
              <Button disabled={disabled} onClick={() => void upload()}>
                <SpinnerIcon icon={Upload} spinning={busy || picking} aria-hidden='true' />
                {busy
                  ? building
                    ? '正在生成补丁…'
                    : '正在准备预览…'
                  : picking
                    ? '正在选择…'
                    : draft
                      ? '更换字体'
                      : '上传字体'}
              </Button>
              <Button
                className={styles.cancelSlot}
                variant='outline'
                disabled={!busy || canceling}
                aria-hidden={!busy}
                tabIndex={busy ? 0 : -1}
                onClick={() => void cancel()}
              >
                {canceling ? '正在取消…' : '取消处理'}
              </Button>
            </div>
            <div className={styles.uploadFooter}>
              <p className={styles.uploadHint} role='status'>
                {loading
                  ? '正在检查字体工具…'
                  : busy
                    ? building
                      ? '正在将已确认的预览打包，请稍候。'
                      : '正在更新字体预览，尚未生成补丁。'
                    : '单文件 ≤ 64 MiB · 本机处理'}
              </p>
              <p className={styles.uploadFeedback} role='status' aria-live='polite'>
                {error}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {!loading && !available && (
        <p className={styles.notice} role='alert'>
          字体工具暂不可用，当前安装包缺少必要组件。
        </p>
      )}
      {draft && (
        <Card className={styles.card}>
          <CardContent>
            <div className={styles.resultHeader}>
              <h2 className={styles.title}>{getFontDisplayName(draft)}</h2>
              <Button variant='outline' disabled={disabled} onClick={() => void reset()}>
                <SpinnerIcon icon={RotateCcw} spinning={resetting} aria-hidden='true' />
                {resetting ? '正在重置…' : '重置'}
              </Button>
            </div>
            <p className={styles.filename}>
              {draft.sourceName} · {draft.glyphCount.toLocaleString()} 个字形
            </p>
            <FontPreview
              draft={draft}
              options={options}
              busy={busy}
              locked={loading || picking || resetting || saving || building || canceling}
              dirty={dirty}
              adjustmentFailed={failedAdjustment === adjustmentKey}
              building={building}
              confirmed={result?.draftId === draft.id}
              onOptionsChange={setOptions}
              onConfirm={() => void confirm()}
            />
            {failedAdjustment === adjustmentKey && (
              <Button variant='outline' disabled={disabled} onClick={() => setFailedAdjustment('')}>
                重试调整预览
              </Button>
            )}
            {draft.missingCharacters && (
              <p className={styles.hint}>样本文字缺字：{draft.missingCharacters}。缺失字符可能由系统字体替代。</p>
            )}
          </CardContent>
        </Card>
      )}
      {result && draft && result.draftId === draft.id && !dirty && (
        <Card className={styles.card}>
          <CardContent>
            <div className={styles.resultHeader}>
              <div className={styles.resultTitle}>
                <CheckCircle2 aria-hidden='true' />
                <h2 className={styles.title}>补丁已生成</h2>
              </div>
              <div className={styles.actions}>
                <Button disabled={disabled} onClick={() => void save()}>
                  <SpinnerIcon icon={Download} spinning={saving} aria-hidden='true' />
                  {saving ? '正在保存…' : '下载补丁'}
                </Button>
              </div>
            </div>
            <p className={styles.filename}>{result.filename}</p>
            <dl className={styles.details}>
              <div>
                <dt className={styles.detailLabel}>来源字体</dt>
                <dd className={styles.detailValue}>{result.sourceName}</dd>
              </div>
              <div>
                <dt className={styles.detailLabel}>字体处理</dt>
                <dd className={styles.detailValue}>
                  {result.adjusted
                    ? `字形 ${result.options.scalePercent}% · 粗细 ${result.options.weight} 档`
                    : result.converted
                      ? 'OTF 已转换为 TrueType'
                      : 'TTF 原样封包'}
                </dd>
              </div>
              <div>
                <dt className={styles.detailLabel}>字形数量</dt>
                <dd className={styles.detailValue}>{result.glyphCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className={styles.detailLabel}>下载大小</dt>
                <dd className={styles.detailValue}>
                  {formatBytes(result.zipBytes)} ZIP · 解压后 {formatBytes(result.pakBytes)}
                </dd>
              </div>
            </dl>
            <p className={styles.hint}>已通过封包回读校验；保存 ZIP 后解压，将其中的 PAK 按游戏补丁方式安装。</p>
            {result.missingCharacters ? (
              <p className={styles.notice}>样本文字缺字：{result.missingCharacters}。建议换用覆盖中文的字体。</p>
            ) : (
              <p className={styles.hint}>常用中英文样本文字检查通过，不代表覆盖全部游戏文字。</p>
            )}
            {savedPath && (
              <p className={styles.saved} role='status'>
                已保存：{savedPath}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <p className={styles.hint}>
        一次只安装一个字体补丁；更换字体不等于统一调整界面字号，游戏内的加载与排版效果仍需实测。
      </p>
    </div>
  )
}
