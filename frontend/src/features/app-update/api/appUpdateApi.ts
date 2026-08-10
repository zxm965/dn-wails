import {
  CheckForApplicationUpdate,
  GetApplicationUpdateInfo,
  InstallApplicationUpdate,
} from '@bindings/dn-wails/internal/application/app'

export interface ApplicationUpdateInfo {
  currentVersion: string
  repository: string
  platform: string
  arch: string
  configured: boolean
  canInstall: boolean
}

export interface ApplicationUpdateStatus {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseName: string
  releaseNotes: string
  releaseUrl: string
  publishedAt: string
}

export async function getApplicationUpdateInfo(): Promise<ApplicationUpdateInfo> {
  const value = await GetApplicationUpdateInfo()
  return {
    currentVersion: value.currentVersion,
    repository: value.repository,
    platform: value.platform,
    arch: value.arch,
    configured: value.configured,
    canInstall: value.canInstall,
  }
}

export async function checkForApplicationUpdate(): Promise<ApplicationUpdateStatus> {
  const value = await CheckForApplicationUpdate()
  return {
    currentVersion: value.currentVersion,
    latestVersion: value.latestVersion,
    updateAvailable: value.updateAvailable,
    releaseName: value.releaseName,
    releaseNotes: value.releaseNotes,
    releaseUrl: value.releaseUrl,
    publishedAt: value.publishedAt,
  }
}

export async function installApplicationUpdate(version: string): Promise<void> {
  await InstallApplicationUpdate(version)
}
