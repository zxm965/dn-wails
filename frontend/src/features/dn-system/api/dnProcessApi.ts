import {
  GetDragonNestShortcutStatus,
  RetryDragonNestShortcut,
  KillDragonNestProcess,
  LaunchDragonNestProcess,
  OpenDragonNestProcessWindow,
  ListDragonNestProcesses,
  TerminateDragonNestProcess,
  SaveDragonNestLauncherPath,
} from '@bindings/cull-pear/internal/application/app'
import { DnLauncherConfiguration } from '@bindings/cull-pear/internal/application/models'
import * as WailsDnProcess from '@bindings/cull-pear/internal/dnprocess/models'
import { Events } from '@wailsio/runtime'

import { isMacOS, isWindows } from '@/shared/lib/platform'
import { pickFiles } from '@/shared/native-kit'

interface ProcessTarget {
  name: string
  displayName: string
  launcherName: string
  pathLabel: string
  placeholder: string
  filePattern: string
  defaultDirectory: string
}

export const PROCESS_TARGET: ProcessTarget = isMacOS()
  ? {
      name: 'Firefox',
      displayName: 'Firefox',
      launcherName: 'firefox',
      pathLabel: 'Firefox.app 或 firefox 可执行文件',
      placeholder: '/Applications/Firefox.app',
      // Application bundles must remain selectable in the native macOS panel.
      // Validate the selected bundle through SaveDragonNestLauncherPath instead.
      filePattern: '',
      defaultDirectory: '/Applications',
    }
  : {
      name: 'DN',
      displayName: '龙之谷',
      launcherName: 'DNLauncher.exe',
      pathLabel: 'DNLauncher.exe',
      placeholder: 'D:\\DragonNest\\DNLauncher.exe',
      filePattern: 'DNLauncher.exe',
      defaultDirectory: '',
    }
export const PROCESS_NAME = PROCESS_TARGET.name
export const PROCESS_CONTROL_SUPPORTED = isMacOS() || isWindows()

export interface DragonNestProcess {
  pid: number
  name: string
  path: string
}

export function onDragonNestProcessesChanged(callback: (waitForProcess: boolean) => void): () => void {
  return Events.On('dn-process:changed', (event) => callback(event.data.action === 'launch'))
}

export async function listDragonNestProcesses(): Promise<DragonNestProcess[]> {
  return (await ListDragonNestProcesses()).map((item) => ({
    pid: item.pid,
    name: item.name,
    path: item.path,
  }))
}

export async function terminateDragonNestProcess(process: DragonNestProcess): Promise<DragonNestProcess> {
  const terminated = await TerminateDragonNestProcess(
    WailsDnProcess.Target.createFrom({ pid: process.pid, name: process.name, path: process.path }),
  )
  return {
    pid: terminated.pid,
    name: terminated.name,
    path: terminated.path,
  }
}

export function getProcessErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('already running')) return '正在操作进程，请稍候。'
  if (message.includes('process launch path is required')) return '请配置启动路径，或打开目标应用后扫描。'
  if (message.includes('process launch application not found'))
    return `找不到 ${PROCESS_TARGET.displayName}，请修改启动路径。`
  if (message.includes('invalid Dragon Nest process target'))
    return `请选择有效的 ${PROCESS_TARGET.pathLabel} 完整路径。`
  if (message.includes('multiple Dragon Nest processes')) return '发现多个进程，请到主窗口的进程页扫描并选择。'
  if (message.includes('Dragon Nest process not found')) return '未找到目标进程，请刷新后重试。'
  if (message.includes('control is unavailable')) return '当前系统暂不支持此进程操作。'
  if (message.includes('Dragon Nest process access denied')) {
    return '没有权限读取或结束进程，请确认目标应用属于当前用户，且运行权限一致。'
  }
  if (message.includes('Dragon Nest process termination timed out')) {
    return '已发送结束请求，但未在 3 秒内确认进程退出；请重新扫描进程确认结果。'
  }
  return message || fallback
}

export async function killDragonNestProcess(): Promise<DragonNestProcess> {
  return KillDragonNestProcess()
}

export async function openDragonNestProcessWindow(): Promise<void> {
  return OpenDragonNestProcessWindow()
}

export async function launchDragonNestProcess(): Promise<void> {
  return LaunchDragonNestProcess()
}

export async function chooseDragonNestLauncher(): Promise<string | undefined> {
  const files = await pickFiles({
    title: `选择 ${PROCESS_TARGET.displayName} 启动文件`,
    defaultDirectory: PROCESS_TARGET.defaultDirectory,
    filters: PROCESS_TARGET.filePattern
      ? [{ displayName: PROCESS_TARGET.displayName, pattern: PROCESS_TARGET.filePattern }]
      : [],
  })
  return files[0]
}

export async function saveDragonNestLauncherPath(path: string): Promise<string> {
  const saved = await SaveDragonNestLauncherPath(new DnLauncherConfiguration({ path }))
  return saved.path
}

export interface DnShortcutStatus {
  revision: number
  enabled: boolean
  key: string
  gameMode: boolean
  registered: boolean
  registrationError: string
  triggerCount: number
  lastTriggeredAt: string
  running: boolean
  lastError: string
  lastProcess: DragonNestProcess
}

export async function getDragonNestShortcutStatus(): Promise<DnShortcutStatus> {
  return GetDragonNestShortcutStatus()
}
export async function retryDragonNestShortcut(): Promise<DnShortcutStatus> {
  return RetryDragonNestShortcut()
}
export function onDragonNestShortcutChanged(callback: (status: DnShortcutStatus) => void): () => void {
  return Events.On('dn-shortcut:changed', (event) => callback(event.data))
}
