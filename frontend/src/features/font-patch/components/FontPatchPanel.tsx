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
} from '../api/fontPatchApi'
import { getFontDisplayName } from '../model/fontName'

import { styles } from './FontPatchPanel.css'

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

export function FontPatchPanel() {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [result, setResult] = useState<FontPatchResult | null>(null)
  const [error, setError] = useState('')
  const [savedPath, setSavedPath] = useState('')
  const operation = useRef(false)
  const dropArea = useRef<HTMLDivElement>(null)
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
        if (status.error) setError(status.error)
        if (status.result) setResult(status.result)
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

  async function generate(path: string) {
    setError('')
    if (!/\.(ttf|otf)$/i.test(path)) {
      setError('请选择 TTF 或静态 OTF 字体文件。')
      return
    }
    setBusy(true)
    setSavedPath('')
    try {
      setResult(await buildFontPatch(path))
    } catch (cause) {
      setError(getErrorMessage(cause, '补丁生成失败，请检查字体文件后重试。'))
    } finally {
      setBusy(false)
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
      if (path) await generate(path)
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
      await generate(paths[0])
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
    setCanceling(true)
    try {
      await cancelFontPatch()
    } catch (cause) {
      setError(getErrorMessage(cause, '取消失败，请稍后重试。'))
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title='工坊' subtitle='上传喜欢的字体，自动生成龙之谷字体补丁。' />
      <Card className={styles.card}>
        <CardContent>
          <div className={styles.upload} ref={dropArea} data-file-drop-target aria-busy={busy}>
            <FileType2 className={styles.icon} aria-hidden='true' />
            <div className={styles.uploadCopy}>
              <h2 className={styles.title}>把喜欢的字体带进游戏</h2>
              <p className={styles.description}>选择或拖入一个 TTF / 静态 OTF 文件，自动生成补丁。</p>
            </div>
            <div className={styles.actions}>
              <Button disabled={disabled} onClick={() => void upload()}>
                <SpinnerIcon icon={Upload} spinning={busy || picking} aria-hidden='true' />
                {busy ? '正在生成补丁…' : picking ? '正在选择…' : '上传字体'}
              </Button>
              {busy && (
                <Button variant='outline' disabled={canceling} onClick={() => void cancel()}>
                  {canceling ? '正在取消…' : '取消生成'}
                </Button>
              )}
            </div>
            <p className={styles.uploadHint} role='status'>
              {loading
                ? '正在检查字体工具…'
                : busy
                  ? '正在检查字体、转换并打包，请稍候。'
                  : '单文件 ≤ 64 MiB · 本机处理'}
            </p>
          </div>
        </CardContent>
      </Card>
      {!loading && !available && (
        <p className={styles.notice} role='alert'>
          字体工具暂不可用，当前安装包缺少必要组件。
        </p>
      )}
      {error && (
        <p className={styles.notice} role='alert'>
          {error}
        </p>
      )}
      {result && (
        <Card className={styles.card}>
          <CardContent>
            <div className={styles.resultHeader}>
              <div className={styles.resultTitle}>
                <CheckCircle2 aria-hidden='true' />
                <h2 className={styles.title}>{getFontDisplayName(result)}</h2>
              </div>
              <div className={styles.actions}>
                <Button variant='outline' disabled={disabled} onClick={() => void reset()}>
                  <SpinnerIcon icon={RotateCcw} spinning={resetting} aria-hidden='true' />
                  {resetting ? '正在重置…' : '重置'}
                </Button>
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
                <dd className={styles.detailValue}>{result.converted ? 'OTF 已转换为 TrueType' : 'TTF 原样封包'}</dd>
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
