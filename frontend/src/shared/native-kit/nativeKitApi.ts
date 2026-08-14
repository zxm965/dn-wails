import {
  GetScreens,
  OpenDirectory,
  OpenExternalURL,
  OpenFiles,
  ReadClipboard,
  SaveFile,
  ShowMessageDialog,
  WriteClipboard,
} from '@bindings/cull-pear/internal/application/app'
import { OpenFilesOptions as WailsOpenFilesOptions } from '@bindings/cull-pear/internal/nativekit/models'
import { SaveFileOptions as WailsSaveFileOptions } from '@bindings/cull-pear/internal/nativekit/models'
import { MessageDialogOptions as WailsMessageDialogOptions } from '@bindings/cull-pear/internal/nativekit/models'
import { Events } from '@wailsio/runtime'

const FILE_DROP_EVENT = 'native-kit:file-drop'

export interface FileFilter {
  displayName: string
  pattern: string
}

export interface OpenFilesOptions {
  title: string
  defaultDirectory?: string
  filters?: FileFilter[]
  multiple?: boolean
}

export interface SaveFileOptions {
  title: string
  defaultDirectory?: string
  defaultFilename?: string
  filters?: FileFilter[]
}

export interface MessageDialogOptions {
  type: 'info' | 'warning' | 'error' | 'question'
  title: string
  message: string
  buttons?: string[]
  defaultButton?: string
  cancelButton?: string
}

export interface ScreenInfo {
  isCurrent: boolean
  isPrimary: boolean
  width: number
  height: number
  physicalWidth: number
  physicalHeight: number
}

export function openExternalURL(url: string): Promise<void> {
  return OpenExternalURL(url)
}

export function readClipboard(): Promise<string> {
  return ReadClipboard()
}

export function writeClipboard(text: string): Promise<void> {
  return WriteClipboard(text)
}

export async function pickFiles(options: OpenFilesOptions): Promise<string[]> {
  const paths = await OpenFiles(
    new WailsOpenFilesOptions({
      title: options.title,
      defaultDirectory: options.defaultDirectory ?? '',
      filters: options.filters ?? [],
      multiple: options.multiple ?? false,
    }),
  )
  return Array.isArray(paths) ? paths : []
}

export function pickDirectory(title: string, defaultDirectory = ''): Promise<string> {
  return OpenDirectory(title, defaultDirectory)
}

export function chooseSavePath(options: SaveFileOptions): Promise<string> {
  return SaveFile(
    new WailsSaveFileOptions({
      title: options.title,
      defaultDirectory: options.defaultDirectory ?? '',
      defaultFilename: options.defaultFilename ?? '',
      filters: options.filters ?? [],
    }),
  )
}

export function showNativeDialog(options: MessageDialogOptions): Promise<string> {
  return ShowMessageDialog(
    new WailsMessageDialogOptions({
      type: options.type,
      title: options.title,
      message: options.message,
      buttons: options.buttons ?? [],
      defaultButton: options.defaultButton ?? '',
      cancelButton: options.cancelButton ?? '',
    }),
  )
}

export async function getScreens(): Promise<ScreenInfo[]> {
  const screens = await GetScreens()
  return screens.map((screen) => ({
    isCurrent: screen.isCurrent,
    isPrimary: screen.isPrimary,
    width: screen.width,
    height: screen.height,
    physicalWidth: screen.physicalWidth,
    physicalHeight: screen.physicalHeight,
  }))
}

export function subscribeFileDrop(callback: (position: { x: number; y: number }, paths: string[]) => void): () => void {
  return Events.On(FILE_DROP_EVENT, (event) => {
    const drop = event.data
    callback({ x: drop.x, y: drop.y }, drop.paths)
  })
}
