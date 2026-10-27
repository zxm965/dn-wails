import { MarkdownPreview } from '@/shared/components/markdown-preview'
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui'

import type { ApplicationUpdateStatus } from '../api/appUpdateApi'

import { styles } from './UpdateReleaseDialog.css'

interface UpdateReleaseDialogProps {
  status: ApplicationUpdateStatus
  confirmUpdate: boolean
  canInstall: boolean
  onDecision: (accepted: boolean) => void
  onOpenLink: (url: string) => void
}

export function UpdateReleaseDialog({
  status,
  confirmUpdate,
  canInstall,
  onDecision,
  onOpenLink,
}: UpdateReleaseDialogProps) {
  const publishedAt = new Date(status.publishedAt)
  const publishedDate = Number.isNaN(publishedAt.getTime()) ? '' : publishedAt.toLocaleDateString('zh-CN')
  const notes = status.releaseNotes.trim()
  const title = confirmUpdate
    ? `发现新版本 ${status.latestVersion}`
    : status.updateAvailable
      ? `版本 ${status.latestVersion} 更新日志`
      : status.currentVersion === status.latestVersion
        ? '当前已是最新版'
        : '没有可用更新'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDecision(false)
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.title}>{title}</DialogTitle>
          <DialogDescription>
            当前版本 {status.currentVersion} · 最新发布 {status.latestVersion}
            {confirmUpdate && '。更新完成后应用将自动安装并重启。'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className={styles.body}>
          <div className={styles.heading}>
            <h3 className={styles.sectionTitle}>更新日志</h3>
            {publishedDate && (
              <time dateTime={status.publishedAt} className={styles.date}>
                {publishedDate}
              </time>
            )}
          </div>
          {status.releaseName && <p className={styles.releaseName}>{status.releaseName}</p>}
          {notes ? (
            <MarkdownPreview content={notes} className={styles.notes} onOpenLink={onOpenLink} />
          ) : (
            <p className={styles.empty}>此版本暂未提供更新日志。</p>
          )}
          {confirmUpdate && !canInstall && <p className={styles.empty}>当前环境不支持自动安装更新。</p>}
        </DialogBody>
        <DialogFooter>
          <Button autoFocus variant='outline' onClick={() => onDecision(false)}>
            {confirmUpdate ? '稍后再说' : '关闭'}
          </Button>
          {confirmUpdate && (
            <Button disabled={!canInstall} onClick={() => onDecision(true)}>
              立即更新
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
