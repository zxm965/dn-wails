import {
  GetScreens,
  OpenDirectory,
  OpenExternalURL,
  OpenFiles,
  ReadClipboard,
  SaveFile,
  ShowMessageDialog,
  WriteClipboard,
} from '@wails/go/application/App'
import { nativekit as WailsNativeKit } from '@wails/go/models'
import { OnFileDrop, OnFileDropOff } from '@wails/runtime/runtime'

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

function toWailsFilters(filters: FileFilter[] = []): WailsNativeKit.FileFilter[] {
  return filters.map((filter) => WailsNativeKit.FileFilter.createFrom(filter))
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

export function pickFiles(options: OpenFilesOptions): Promise<string[]> {
  return OpenFiles(
    WailsNativeKit.OpenFilesOptions.createFrom({
      title: options.title,
      defaultDirectory: options.defaultDirectory ?? '',
      filters: toWailsFilters(options.filters),
      multiple: options.multiple ?? false,
    }),
  )
}

export function pickDirectory(title: string, defaultDirectory = ''): Promise<string> {
  return OpenDirectory(title, defaultDirectory)
}

export function chooseSavePath(options: SaveFileOptions): Promise<string> {
  return SaveFile(
    WailsNativeKit.SaveFileOptions.createFrom({
      title: options.title,
      defaultDirectory: options.defaultDirectory ?? '',
      defaultFilename: options.defaultFilename ?? '',
      filters: toWailsFilters(options.filters),
    }),
  )
}

export function showNativeDialog(options: MessageDialogOptions): Promise<string> {
  return ShowMessageDialog(
    WailsNativeKit.MessageDialogOptions.createFrom({
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

export function subscribeFileDrop(
  callback: (position: { x: number; y: number }, paths: string[]) => void,
  useDropTarget = true,
): () => void {
  OnFileDrop((x, y, paths) => callback({ x, y }, paths), useDropTarget)
  return () => OnFileDropOff()
}
