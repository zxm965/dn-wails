import {
  Activity,
  AppWindow,
  ClipboardCheck,
  FileUp,
  Fullscreen,
  FolderOpen,
  Maximize2,
  MonitorCog,
  MousePointerClick,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { SystemNotificationPanel } from '@/features/system-notification'
import { Button, PageHeader } from '@/shared/components/ui'
import { openDiagnosticsDirectory } from '@/shared/diagnostics'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { pickFiles, readClipboard, subscribeFileDrop, writeClipboard } from '@/shared/native-kit'
import { windowManager } from '@/shared/window'

import { DesktopOverview } from './DesktopOverview'
import { DeveloperTextToolbox } from './DeveloperTextToolbox'
import { RuntimeStatusPanel } from './RuntimeStatusPanel'

import { styles } from './DevToolsPanel.css'

const cx = createScopedClassNames(styles)

type ToolCategory = 'overview' | 'runtime' | 'desktop' | 'text'

const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string; description: string }> = [
  { id: 'overview', label: '应用概览', description: '版本、更新与界面偏好' },
  { id: 'runtime', label: '运行状态', description: '服务、环境与日志' },
  { id: 'desktop', label: '桌面实验室', description: '窗口与原生能力验证' },
  { id: 'text', label: '文本工具', description: 'JSON、编码与哈希' },
]

export function DevToolsPanel({ showDesktopLab = false }: { showDesktopLab?: boolean }) {
  const { notify, confirm } = useFeedback()
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('overview')
  const [result, setResult] = useState('选择测试操作后，结果会显示在这里。')
  const [droppedFiles, setDroppedFiles] = useState<string[]>([])
  const visibleCategories = TOOL_CATEGORIES.filter((category) => category.id !== 'desktop' || showDesktopLab)
  const desktopActive = showDesktopLab && activeCategory === 'desktop'

  useEffect(() => {
    if (!showDesktopLab) return
    return subscribeFileDrop((_position, paths) => {
      setDroppedFiles(paths)
      setResult(
        paths.length > 0
          ? `已接收 ${paths.length} 个拖放文件：\n${paths.slice(0, 4).join('\n')}`
          : '文件拖放事件未包含有效路径。',
      )
      setActiveCategory('desktop')
    })
  }, [showDesktopLab])

  useEffect(() => {
    if (!showDesktopLab && activeCategory === 'desktop') {
      setActiveCategory('overview')
    }
  }, [activeCategory, showDesktopLab])

  async function runAction(label: string, action: () => Promise<string>) {
    try {
      const value = await action()
      setResult(value || `${label}已完成。`)
      notify({ title: `${label}成功`, tone: 'success' })
    } catch (actionError: unknown) {
      const message = actionError instanceof Error ? actionError.message : `${label}失败。`
      setResult(message)
      notify({ title: `${label}失败`, message, tone: 'error' })
    }
  }

  async function verifyAppInteraction() {
    const accepted = await confirm({
      title: '应用交互验证',
      message: '确认后将同时验证对话框返回值和应用内消息反馈。',
    })
    const message = accepted ? '确认窗口返回 true，应用内反馈正常。' : '确认窗口返回 false，取消流程正常。'
    setResult(message)
    notify({ title: '应用交互验证完成', message, tone: accepted ? 'success' : 'info' })
  }

  async function verifyClipboard() {
    const original = await readClipboard()
    const sample = `${appConfig.displayName} clipboard verification`
    try {
      await writeClipboard(sample)
      const current = await readClipboard()
      if (current !== sample) throw new Error('剪贴板写入结果不一致。')
      return '剪贴板读取和写入验证成功，原内容已恢复。'
    } finally {
      await writeClipboard(original)
    }
  }

  return (
    <section className={cx('devtools-panel')}>
      <PageHeader
        eyebrow='Developer workspace'
        title='DevTools'
        subtitle='查看应用信息、运行健康、开发工具与桌面原生能力。'
        actions={
          <span className={cx('devtools-badge')}>
            <span aria-hidden='true' />
            Developer mode
          </span>
        }
      />

      <div className={cx('devtools-layout')}>
        <nav
          className={cx('devtools-categories')}
          style={{ gridTemplateColumns: `repeat(${visibleCategories.length}, minmax(0, 1fr))` }}
          aria-label='DevTools 分类'
        >
          {visibleCategories.map((category, index) => (
            <Button
              key={category.id}
              className={cx(activeCategory === category.id ? 'is-active' : '')}
              size='md'
              type='button'
              variant='ghost'
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className={cx('devtools-category-index')}>{String(index + 1).padStart(2, '0')}</span>
              <span className={cx('devtools-category-copy')}>
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </span>
            </Button>
          ))}
        </nav>

        <div className={cx('devtools-view')}>
          {activeCategory === 'overview' && <DesktopOverview embedded />}

          {activeCategory === 'runtime' && <RuntimeStatusPanel />}

          {desktopActive && (
            <div className={cx('devtools-capability-content')}>
              <section className={cx('devtools-section devtools-desktop-lab')}>
                <header className={cx('devtools-lab-header')}>
                  <div>
                    <span>Desktop laboratory / 01</span>
                    <h2>桌面实验室</h2>
                    <p>用一组代表性动作验证应用交互、窗口控制与原生系统集成。</p>
                  </div>
                  <span className={cx('devtools-lab-meta')}>8 个操作</span>
                </header>

                <article className={cx('devtools-result')}>
                  <span className={cx('devtools-result-icon')} aria-hidden='true'>
                    <Activity />
                  </span>
                  <div>
                    <span>最近一次结果</span>
                    <p>{result}</p>
                  </div>
                </article>

                <div className={cx('devtools-capability-grid')}>
                  <section className={cx('devtools-capability-group')}>
                    <div className={cx('devtools-capability-heading')}>
                      <span className={cx('devtools-capability-icon')} aria-hidden='true'>
                        <AppWindow />
                      </span>
                      <div>
                        <small>Interaction</small>
                        <strong>应用与窗口</strong>
                      </div>
                      <span className={cx('devtools-capability-count')}>04</span>
                    </div>
                    <p>验证应用内反馈链路，以及主窗口状态读取与控制。</p>

                    <div className={cx('devtools-actions')}>
                      <Button type='button' variant='secondary' onClick={() => void verifyAppInteraction()}>
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <MousePointerClick />
                        </span>
                        <span>验证应用交互</span>
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() =>
                          runAction('验证主窗口', async () => {
                            const snapshot = await windowManager.snapshot()
                            windowManager.center()
                            return `原位置 ${snapshot.x}, ${snapshot.y}；尺寸 ${snapshot.width} × ${snapshot.height}；已执行窗口居中。`
                          })
                        }
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <MonitorCog />
                        </span>
                        <span>验证主窗口</span>
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() =>
                          runAction('切换最大化', async () => {
                            await windowManager.toggleMaximise()
                            return '已切换主窗口最大化状态。'
                          })
                        }
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <Maximize2 />
                        </span>
                        <span>切换最大化</span>
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() =>
                          runAction('切换全屏', async () => {
                            const snapshot = await windowManager.snapshot()
                            if (snapshot.fullscreen) await windowManager.unfullscreen()
                            else await windowManager.fullscreen()
                            return `已${snapshot.fullscreen ? '退出' : '进入'}全屏模式。`
                          })
                        }
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <Fullscreen />
                        </span>
                        <span>切换全屏</span>
                      </Button>
                    </div>
                  </section>

                  <section className={cx('devtools-capability-group')}>
                    <div className={cx('devtools-capability-heading')}>
                      <span className={cx('devtools-capability-icon')} aria-hidden='true'>
                        <FolderOpen />
                      </span>
                      <div>
                        <small>Native integration</small>
                        <strong>系统与文件</strong>
                      </div>
                      <span className={cx('devtools-capability-count')}>04</span>
                    </div>
                    <p>验证剪贴板、文件选择与诊断目录等原生能力。</p>

                    <div className={cx('devtools-actions')}>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() => runAction('验证剪贴板', verifyClipboard)}
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <ClipboardCheck />
                        </span>
                        <span>验证剪贴板</span>
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() =>
                          runAction('选择文件', async () => {
                            const paths = await pickFiles({ title: '选择文件', multiple: true })
                            return paths.length > 0 ? paths.join('\n') : '已取消选择。'
                          })
                        }
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <FileUp />
                        </span>
                        <span>选择文件</span>
                      </Button>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() =>
                          runAction('打开日志目录', async () => {
                            await openDiagnosticsDirectory()
                            return '日志目录已打开。'
                          })
                        }
                      >
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <FolderOpen />
                        </span>
                        <span>打开日志目录</span>
                      </Button>
                      <div className={cx('devtools-drop-action')} aria-label='文件拖放区域'>
                        <span className={cx('devtools-action-icon')} aria-hidden='true'>
                          <UploadCloud />
                        </span>
                        <span className={cx('devtools-drop-copy')}>
                          <strong>拖放文件</strong>
                          <small>{droppedFiles.length > 0 ? `已接收 ${droppedFiles.length} 个` : '拖到此处验证'}</small>
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <SystemNotificationPanel embedded />
            </div>
          )}

          {activeCategory === 'text' && <DeveloperTextToolbox />}
        </div>
      </div>
    </section>
  )
}
