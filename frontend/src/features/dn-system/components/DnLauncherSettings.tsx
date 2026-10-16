import { FolderOpen, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { useSettings } from '@/features/settings'
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'

import {
  PROCESS_TARGET,
  chooseDragonNestLauncher,
  getProcessErrorMessage,
  saveDragonNestLauncherPath,
} from '../api/dnProcessApi'

import { styles } from './DnLauncherSettings.css'

interface DnLauncherSettingsProps {
  scanned: boolean
  launcherDetected: boolean
}

export function DnLauncherSettings({ scanned, launcherDetected }: DnLauncherSettingsProps) {
  const { settings, isLoading, refreshSettings } = useSettings()
  const { notify } = useFeedback()
  const savedPath = settings.dragonNest.launcherPath
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [error, setError] = useState('')
  const missing = scanned && !launcherDetected && !savedPath
  const busy = saving || choosing || isLoading
  const application = PROCESS_TARGET.displayName

  function changeOpen(next: boolean) {
    if (saving || choosing) return
    if (next) {
      setDraft(savedPath)
      setError('')
    }
    setOpen(next)
  }

  async function choose() {
    if (busy) return
    setChoosing(true)
    setError('')
    try {
      const selected = await chooseDragonNestLauncher()
      if (selected) setDraft(selected)
    } catch (error) {
      setError(getProcessErrorMessage(error, '选择应用失败，请重试。'))
    } finally {
      setChoosing(false)
    }
  }

  async function save() {
    if (busy || !draft.trim()) return
    setSaving(true)
    setError('')
    try {
      await saveDragonNestLauncherPath(draft.trim())
      await refreshSettings()
      setOpen(false)
      notify({ title: '启动路径已保存', tone: 'success' })
    } catch (error) {
      setError(getProcessErrorMessage(error, '保存失败，请重试。'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.entry}>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger render={<Button variant='outline' disabled={busy} />}>
          <Settings2 aria-hidden='true' />
          {savedPath ? '修改启动路径' : '配置启动路径'}
        </DialogTrigger>
        <DialogContent size='sm' showCloseButton={!saving && !choosing}>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <DialogHeader>
              <DialogTitle>{savedPath ? '修改启动路径' : '配置启动路径'}</DialogTitle>
              <DialogDescription>选择 {PROCESS_TARGET.pathLabel}，或填写完整路径。</DialogDescription>
            </DialogHeader>
            <DialogBody className={styles.fields}>
              <Label htmlFor='dn-launcher-path'>{application} 路径</Label>
              <Input
                id='dn-launcher-path'
                value={draft}
                placeholder={PROCESS_TARGET.placeholder}
                maxLength={4096}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'dn-launcher-error' : undefined}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setError('')
                }}
              />
              <div className={styles.fileAction}>
                <Button type='button' variant='outline' disabled={busy} onClick={() => void choose()}>
                  <FolderOpen aria-hidden='true' />
                  {choosing ? '选择中…' : '选择文件'}
                </Button>
              </div>
              {error && (
                <p id='dn-launcher-error' className={styles.error} role='alert'>
                  {error}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type='button' variant='outline' disabled={saving || choosing} onClick={() => changeOpen(false)}>
                取消
              </Button>
              <Button type='submit' disabled={busy || !draft.trim() || draft.trim() === savedPath}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {missing && <p className={styles.hint}>未扫描到 {application}，请配置启动路径。</p>}
    </div>
  )
}
