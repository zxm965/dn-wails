import { useCallback, useEffect, useState } from 'react'

import { appConfig } from '@/app/appConfig'
import { SystemNotificationPanel } from '@/features/system-notification'
import { useAppLifecycle, type SecondInstanceLaunch } from '@/shared/app-lifecycle'
import { AppButton } from '@/shared/components/button'
import { getDiagnosticsInfo, openDiagnosticsDirectory, type DiagnosticsInfo } from '@/shared/diagnostics'
import { useFeedback } from '@/shared/feedback'
import {
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

import './TestToolsPanel.css'

type ToolCategory = 'interaction' | 'native' | 'notification'

const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string; description: string }> = [
  { id: 'interaction', label: '交互与窗口', description: 'Overlay、反馈和主窗口能力' },
  { id: 'native', label: '原生能力', description: '文件、剪贴板、屏幕和诊断' },
  { id: 'notification', label: '系统通知', description: '权限、消息预览和点击回传' },
]

export function TestToolsPanel() {
  const { notify, confirm } = useFeedback()
  const { openOverlay } = useOverlay()
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('interaction')
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
      setActiveCategory('native')
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
        <div className='test-tools-overlay-demo'>
          <p>这是应用内 Overlay 子视图。它不会创建新的操作系统窗口。</p>
          <AppButton className='test-tools-button is-primary' type='button' onClick={close}>
            关闭子视图
          </AppButton>
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
    <section className='test-tools-panel'>
      <header className='test-tools-heading'>
        <div>
          <p>System settings</p>
          <h1>测试工具</h1>
          <span>开发和验收阶段使用，不承载正式业务入口。</span>
        </div>
        <span className='test-tools-badge'>Developer tools</span>
      </header>

      <div className='test-tools-layout'>
        <nav className='test-tools-categories' aria-label='测试工具分类'>
          {TOOL_CATEGORIES.map((category) => (
            <AppButton
              key={category.id}
              className={activeCategory === category.id ? 'is-active' : ''}
              size='md'
              type='button'
              onClick={() => setActiveCategory(category.id)}
            >
              <strong>{category.label}</strong>
              <small>{category.description}</small>
            </AppButton>
          ))}
        </nav>

        <div className='test-tools-view'>
          {activeCategory !== 'notification' && (
            <article className='test-tools-result'>
              <span>最近一次结果</span>
              <p>{result}</p>
            </article>
          )}

          {activeCategory === 'interaction' && (
            <ToolSection title='交互与窗口' description='验证应用内反馈、子视图和主窗口控制。'>
              <div className='test-tools-actions'>
                <AppButton
                  type='button'
                  onClick={() => notify({ title: 'Toast 测试', message: '应用内反馈模块工作正常。', tone: 'info' })}
                >
                  显示 Toast
                </AppButton>
                <AppButton type='button' onClick={openConfirmTest}>
                  确认对话框
                </AppButton>
                <AppButton type='button' onClick={openOverlayTest}>
                  打开 Overlay
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() => {
                    windowManager.center()
                    setResult('窗口已移动到当前屏幕中央。')
                  }}
                >
                  窗口居中
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() =>
                    runAction('读取窗口状态', async () => {
                      const snapshot = await windowManager.snapshot()
                      return `位置 ${snapshot.x}, ${snapshot.y}；尺寸 ${snapshot.width} × ${snapshot.height}；最大化：${snapshot.maximised ? '是' : '否'}`
                    })
                  }
                >
                  读取窗口状态
                </AppButton>
              </div>

              <div className='test-tools-note'>
                单实例测试：再次启动当前应用，已有窗口应恢复并显示，结果会记录在本页。
              </div>
            </ToolSection>
          )}

          {activeCategory === 'native' && (
            <ToolSection title='原生能力' description='验证 Wails 文件、剪贴板、屏幕、对话框和系统集成。'>
              <div className='test-tools-actions'>
                <AppButton
                  type='button'
                  onClick={() => runAction('读取剪贴板', async () => (await readClipboard()) || '剪贴板为空。')}
                >
                  读取剪贴板
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() =>
                    runAction('写入剪贴板', async () => {
                      const content = `${appConfig.displayName} Native Kit`
                      await writeClipboard(content)
                      return `已写入剪贴板：${content}`
                    })
                  }
                >
                  写入剪贴板
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() =>
                    runAction('选择文件', async () => {
                      const paths = await pickFiles({ title: '选择文件', multiple: true })
                      return paths.length > 0 ? paths.join('\n') : '已取消选择。'
                    })
                  }
                >
                  选择文件
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() => runAction('选择目录', async () => (await pickDirectory('选择目录')) || '已取消选择。')}
                >
                  选择目录
                </AppButton>
                <AppButton
                  type='button'
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
                </AppButton>
                <AppButton
                  type='button'
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
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() =>
                    runAction('打开日志目录', async () => {
                      await openDiagnosticsDirectory()
                      return diagnostics?.logDirectory ?? '日志目录已打开。'
                    })
                  }
                >
                  打开日志目录
                </AppButton>
                <AppButton
                  type='button'
                  onClick={() =>
                    runAction('打开外部链接', async () => {
                      await openExternalURL('https://wails.io/docs/')
                      return '已交给系统默认浏览器打开。'
                    })
                  }
                >
                  打开 Wails 文档
                </AppButton>
              </div>

              <div className='test-tools-dropzone'>
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
          )}

          {activeCategory === 'notification' && <SystemNotificationPanel embedded />}
        </div>
      </div>
    </section>
  )
}

interface ToolSectionProps {
  title: string
  description: string
  children: React.ReactNode
}

function ToolSection({ title, description, children }: ToolSectionProps) {
  return (
    <section className='test-tools-section'>
      <header>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  )
}
