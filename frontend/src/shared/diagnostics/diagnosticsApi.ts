import {
  GetDiagnosticsInfo,
  GetRuntimeStatus,
  OpenDiagnosticsDirectory,
} from '@bindings/cull-pear/internal/application/app'

export interface DiagnosticsInfo {
  appName: string
  appVersion: string
  goVersion: string
  os: string
  arch: string
  startedAt: string
  logDirectory: string
  logFile: string
}

export type RuntimeOverall = 'healthy' | 'degraded'
export type RuntimeServiceState = 'ready' | 'warning' | 'unavailable' | 'error'

export interface RuntimeServiceStatus {
  key: string
  label: string
  status: RuntimeServiceState
  detail: string
}

export interface RuntimeStatus {
  overall: RuntimeOverall
  checkedAt: string
  startedAt: string
  uptimeSeconds: number
  ready: boolean
  secondInstanceCount: number
  appVersion: string
  goVersion: string
  os: string
  arch: string
  logDirectory: string
  logFile: string
  services: RuntimeServiceStatus[]
}

export async function getDiagnosticsInfo(): Promise<DiagnosticsInfo> {
  const info = await GetDiagnosticsInfo()
  return { ...info }
}

export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  const value = await GetRuntimeStatus()
  return {
    overall: value.overall as RuntimeOverall,
    checkedAt: value.checkedAt,
    startedAt: value.startedAt,
    uptimeSeconds: value.uptimeSeconds,
    ready: value.ready,
    secondInstanceCount: value.secondInstanceCount,
    appVersion: value.appVersion,
    goVersion: value.goVersion,
    os: value.os,
    arch: value.arch,
    logDirectory: value.logDirectory,
    logFile: value.logFile,
    services: value.services.map((service) => ({
      key: service.key,
      label: service.label,
      status: service.status as RuntimeServiceState,
      detail: service.detail,
    })),
  }
}

export function openDiagnosticsDirectory(): Promise<void> {
  return OpenDiagnosticsDirectory()
}
