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
  return error instanceof Error && error.message ? error.message : fallback
}
