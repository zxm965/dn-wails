import { ListDragonNestProcesses, TerminateDragonNestProcess } from '@bindings/cull-pear/internal/application/app'
import * as WailsDnProcess from '@bindings/cull-pear/internal/dnprocess/models'

export interface DragonNestProcess {
  pid: number
  name: string
  path: string
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
  if (message.includes('Dragon Nest process access denied')) {
    return '没有权限读取或结束龙之谷进程；若游戏以管理员身份运行，请以相同权限运行本应用后重试。'
  }
  if (message.includes('Dragon Nest process termination timed out')) {
    return '已发送结束请求，但未在 3 秒内确认进程退出；请重新扫描进程确认结果。'
  }
  return message || fallback
}
