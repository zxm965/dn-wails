import {
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

export const PROCESS_NAME = isMacOS() ? 'Firefox' : 'DN'
export const PROCESS_TEST_MODE = isMacOS()
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
  if (message.includes('process launch path is required'))
    return '请在主窗口配置启动器路径，或打开 DNLauncher.exe 后扫描。'
  if (message.includes('process launch application not found')) {
    return PROCESS_TEST_MODE
      ? '找不到 Firefox，请确认已安装且路径未改变。'
      : '找不到 DNLauncher.exe，请在主窗口修改启动器路径。'
  }
  if (message.includes('invalid Dragon Nest process target')) return '目标应用路径无效，请在主窗口重新扫描。'
  if (message.includes('multiple Dragon Nest processes')) return '发现多个进程，请到主窗口的进程页扫描并选择。'
  if (message.includes('Dragon Nest process not found')) return '未找到目标进程，请刷新后重试。'
  if (message.includes('control is unavailable')) return '当前系统暂不支持此进程操作。'
  if (message.includes('Dragon Nest process access denied')) {
    return PROCESS_TEST_MODE
      ? '没有权限关闭 Firefox，请确认它属于当前用户。'
      : '没有权限读取或结束龙之谷进程；若游戏以管理员身份运行，请以相同权限运行本应用后重试。'
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
    title: '选择龙之谷启动器 DNLauncher.exe',
    filters: [{ displayName: '龙之谷启动器', pattern: 'DNLauncher.exe' }],
  })
  return files[0]
}

export async function saveDragonNestLauncherPath(path: string): Promise<string> {
  const saved = await SaveDragonNestLauncherPath(new DnLauncherConfiguration({ path }))
  return saved.path
}
