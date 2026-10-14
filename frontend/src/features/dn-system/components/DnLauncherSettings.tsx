import { FolderOpen } from 'lucide-react'
import { useState } from 'react'

import { useSettings } from '@/features/settings'
import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui'

import { chooseDragonNestLauncher, getProcessErrorMessage, saveDragonNestLauncherPath } from '../api/dnProcessApi'

import { styles } from './DnLauncherSettings.css'

interface DnLauncherSettingsProps {
  scanned: boolean
  launcherDetected: boolean
}

export function DnLauncherSettings({ scanned, launcherDetected }: DnLauncherSettingsProps) {
  const { settings, isLoading, refreshSettings } = useSettings()
  const savedPath = settings.dragonNest.launcherPath
  const [draft, setDraft] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const path = draft ?? savedPath
  const missing = scanned && !launcherDetected
  const expanded = editing || missing
  const busy = saving || choosing || isLoading

  async function choose() {
    if (busy) return
    setChoosing(true)
    setError('')
    setMessage('')
    try {
      const selected = await chooseDragonNestLauncher()
      if (selected) {
        setDraft(selected)
        setEditing(true)
      }
    } catch (error) {
      setError(getProcessErrorMessage(error, '选择启动器失败，请重试。'))
    } finally {
      setChoosing(false)
    }
  }

  async function save() {
    if (busy || !path.trim()) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveDragonNestLauncherPath(path.trim())
      setDraft(saved)
      await refreshSettings()
      setDraft(null)
      setEditing(false)
      setMessage('启动器路径已保存')
    } catch (error) {
      setError(
        error instanceof Error && error.message.includes('invalid Dragon Nest process target')
          ? '请选择有效的 DNLauncher.exe 完整路径。'
          : getProcessErrorMessage(error, '保存失败，请重试。'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={styles.card}>
      <CardContent>
        <div className={styles.header}>
          <strong>启动器路径</strong>
          {!expanded && (
            <Button variant='outline' disabled={busy} onClick={() => setEditing(true)}>
              {savedPath ? '修改' : '配置'}
            </Button>
          )}
        </div>
        {missing && (
          <p className={styles.hint}>
            {savedPath
              ? '未扫描到启动器，可使用已保存路径启动，或在下方修改。'
              : '未扫描到启动器，请配置 DNLauncher.exe 路径。'}
          </p>
        )}
        {expanded ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <Label htmlFor='dn-launcher-path'>DNLauncher.exe 完整路径</Label>
            <div className={styles.controls}>
              <Input
                id='dn-launcher-path'
                value={path}
                placeholder='例如 D:\DragonNest\DNLauncher.exe'
                maxLength={4096}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'dn-launcher-error' : undefined}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setEditing(true)
                  setError('')
                  setMessage('')
                }}
              />
              <div className={styles.actions}>
                <Button type='button' variant='outline' disabled={busy} onClick={() => void choose()}>
                  <FolderOpen aria-hidden='true' />
                  {choosing ? '选择中…' : '选择文件'}
                </Button>
                <Button type='submit' disabled={busy || !path.trim() || path.trim() === savedPath}>
                  {saving ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <p className={styles.path} title={savedPath}>
            {savedPath || '扫描可自动记住启动器，也可手动配置。'}
          </p>
        )}
        {error && (
          <p id='dn-launcher-error' className={styles.error} role='alert'>
            {error}
          </p>
        )}
        {message && (
          <p className={styles.hint} role='status'>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
