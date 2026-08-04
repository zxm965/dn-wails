import { useCallback, useEffect, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { SystemNotificationPanel } from '@/features/system-notification'
import { useAppLifecycle, type SecondInstanceLaunch } from '@/shared/app-lifecycle'
import { Button, PageHeader } from '@/shared/components/ui'
import { getDiagnosticsInfo, openDiagnosticsDirectory, type DiagnosticsInfo } from '@/shared/diagnostics'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import {
  chooseSavePath,
  getScreens,
  openExternalURL,
  pickDirectory,
  pickFiles,
  readClipboard,
  showNativeDialog,
  subscribeFileDrop,
  writeClipboard,
} from '@/shared/native-kit'
import { useOverlay } from '@/shared/overlay'
import { windowManager } from '@/shared/window'

import { DesktopOverview } from './DesktopOverview'
import { DeveloperTextToolbox } from './DeveloperTextToolbox'

import { styles } from './TestToolsPanel.css'

const cx = createScopedClassNames(styles)

type ToolCategory = 'overview' | 'desktop' | 'text'

const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string; description: string }> = [
  { id: 'overview', label: '应用概览', description: '版本、平台与更新' },
  { id: 'desktop', label: '桌面能力', description: '窗口、系统集成与通知' },
  { id: 'text', label: '文本工具', description: 'JSON、编码与哈希' },
]

export function TestToolsPanel() {
  const { notify, confirm } = useFeedback()
  const { openOverlay } = useOverlay()
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('overview')
  const [result, setResult] = useState('选择测试操作后，结果会显示在这里。')
  const [droppedFiles, setDroppedFiles] = useState<string[]>([])
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null)

  const handleSecondInstance = useCallback(
    (launch: SecondInstanceLaunch) => {
      const value = launch.arguments.length > 0 ? launch.arguments.join(' ') : launch.workingDirectory
      setResult(`检测到第二实例启动：${value || '无启动参数'}`)
      notify({ title: '第二实例唤醒测试成功', message: value || '应用窗口已被唤醒。', tone: 'success' })
    },
    [notify],
  )

  useAppLifecycle(handleSecondInstance)

  useEffect(() => {
    void getDiagnosticsInfo()
      .then(setDiagnostics)
      .catch(() => setDiagnostics(null))
  }, [])

  useEffect(() => {
    return subscribeFileDrop((_position, paths) => {
      setDroppedFiles(paths)
      setResult(`已接收 ${paths.length} 个拖放文件。`)
      setActiveCategory('desktop')
    })
  }, [])

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

  function openOverlayTest() {
    openOverlay(
      ({ close }) => (
        <div className={cx('test-tools-overlay-demo')}>
          <p>这是应用内 Overlay 子视图。它不会创建新的操作系统窗口。</p>
          <Button className={cx('test-tools-button is-primary')} type='button' variant='primary' onClick={close}>
            关闭子视图
          </Button>
        </div>
      ),
      { title: 'Overlay 测试', size: 'medium' },
    )
  }

  async function openConfirmTest() {
    const accepted = await confirm({
      title: '确认交互测试',
      message: '用于验证统一确认窗口和 Promise 返回结果。',
    })
    setResult(accepted ? '确认窗口返回：true' : '确认窗口返回：false')
  }

  return (
    <section className={cx('test-tools-panel')}>
      <PageHeader
        eyebrow='Desktop lab'
        title='测试工具'
        subtitle='集中验证桌面运行、系统集成与原生交互。'
        actions={
          <span className={cx('test-tools-badge')}>
            <span aria-hidden='true' />
            Developer mode
          </span>
        }
      />

      <div className={cx('test-tools-layout')}>
        <nav className={cx('test-tools-categories')} aria-label='测试工具分类'>
          {TOOL_CATEGORIES.map((category, index) => (
            <Button
              key={category.id}
              className={cx(activeCategory === category.id ? 'is-active' : '')}
              size='md'
              type='button'
              variant='ghost'
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className={cx('test-tools-category-index')}>{String(index + 1).padStart(2, '0')}</span>
              <span className={cx('test-tools-category-copy')}>
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </span>
            </Button>
          ))}
        </nav>

        <div className={cx('test-tools-view')}>
          {activeCategory === 'desktop' && (
            <article className={cx('test-tools-result')}>
              <span>最近一次结果</span>
              <p>{result}</p>
            </article>
          )}

          {activeCategory === 'overview' && <DesktopOverview embedded />}

          {activeCategory === 'desktop' && (
            <div className={cx('test-tools-capability-content')}>
              <div className={cx('test-tools-capability-grid')}>
                <ToolSection
                  eyebrow='Interaction / 01'
                  title='交互窗口'
                  description='验证应用内反馈、子视图和主窗口控制。'
                >
                  <div className={cx('test-tools-actions')}>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() => notify({ title: 'Toast 测试', message: '应用内反馈模块工作正常。', tone: 'info' })}
                    >
                      显示 Toast
                    </Button>
                    <Button type='button' variant='secondary' onClick={openConfirmTest}>
                      确认对话框
                    </Button>
                    <Button type='button' variant='secondary' onClick={openOverlayTest}>
                      打开 Overlay
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() => {
                        windowManager.center()
                        setResult('窗口已移动到当前屏幕中央。')
                      }}
                    >
                      窗口居中
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('读取窗口状态', async () => {
                          const snapshot = await windowManager.snapshot()
                          return `位置 ${snapshot.x}, ${snapshot.y}；尺寸 ${snapshot.width} × ${snapshot.height}；最大化：${snapshot.maximised ? '是' : '否'}`
                        })
                      }
                    >
                      读取窗口状态
                    </Button>
                  </div>

                  <div className={cx('test-tools-note')}>
                    单实例测试：再次启动当前应用，已有窗口应恢复并显示，结果会记录在本页。
                  </div>
                </ToolSection>

                <ToolSection
                  eyebrow='Native / 02'
                  title='原生能力'
                  description='验证文件、剪贴板、屏幕、对话框和系统集成。'
                >
                  <div className={cx('test-tools-actions')}>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() => runAction('读取剪贴板', async () => (await readClipboard()) || '剪贴板为空。')}
                    >
                      读取剪贴板
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('写入剪贴板', async () => {
                          const content = `${appConfig.displayName} Native Kit`
                          await writeClipboard(content)
                          return `已写入剪贴板：${content}`
                        })
                      }
                    >
                      写入剪贴板
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
                      选择文件
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('选择目录', async () => (await pickDirectory('选择目录')) || '已取消选择。')
                      }
                    >
                      选择目录
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('选择保存路径', async () => {
                          const path = await chooseSavePath({
                            title: '选择保存路径',
                            defaultFilename: 'diagnostics-report.json',
                            filters: [{ displayName: 'JSON 文件', pattern: '*.json' }],
                          })
                          return path || '已取消选择。'
                        })
                      }
                    >
                      选择保存路径
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('读取屏幕', async () => {
                          const screens = await getScreens()
                          return screens
                            .map(
                              (screen, index) =>
                                `屏幕 ${index + 1}：${screen.width} × ${screen.height}${screen.isPrimary ? '（主屏幕）' : ''}`,
                            )
                            .join('\n')
                        })
                      }
                    >
                      读取屏幕
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('原生对话框', async () => {
                          const selected = await showNativeDialog({
                            type: 'info',
                            title: 'Native Kit',
                            message: '这是 Wails 原生消息对话框。',
                            buttons: ['知道了'],
                            defaultButton: '知道了',
                          })
                          return selected || '对话框已关闭。'
                        })
                      }
                    >
                      原生对话框
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('打开日志目录', async () => {
                          await openDiagnosticsDirectory()
                          return diagnostics?.logDirectory ?? '日志目录已打开。'
                        })
                      }
                    >
                      打开日志目录
                    </Button>
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        runAction('打开外部链接', async () => {
                          await openExternalURL('https://v3.wails.io/')
                          return '已交给系统默认浏览器打开。'
                        })
                      }
                    >
                      打开 Wails 文档
                    </Button>
                  </div>

                  <div className={cx('test-tools-dropzone')}>
                    <strong>文件拖放区域</strong>
                    <span>将文件拖到这里验证 Wails Drag &amp; Drop</span>
                    {droppedFiles.length > 0 && (
                      <ul>
                        {droppedFiles.slice(0, 5).map((path) => (
                          <li key={path}>{path}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </ToolSection>
              </div>

              <SystemNotificationPanel embedded />
            </div>
          )}

          {activeCategory === 'text' && <DeveloperTextToolbox />}
        </div>
      </div>
    </section>
  )
}

interface ToolSectionProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

function ToolSection({ eyebrow, title, description, children }: ToolSectionProps) {
  return (
    <section className={cx('test-tools-section')}>
      <header>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  )
}
