import { GetDiagnosticsInfo, OpenDiagnosticsDirectory } from '@wails/go/application/App'

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
