import { GetDiagnosticsInfo, OpenDiagnosticsDirectory } from '@bindings/dn-wails/internal/application/app'

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

export async function getDiagnosticsInfo(): Promise<DiagnosticsInfo> {
  const info = await GetDiagnosticsInfo()
  return { ...info }
}

export function openDiagnosticsDirectory(): Promise<void> {
  return OpenDiagnosticsDirectory()
}
