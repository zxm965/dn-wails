import {
  BuildFontPatch,
  CancelFontPatch,
  GetFontPatchStatus,
  SaveFontPatch,
  ResetFontPatch,
} from '@bindings/cull-pear/internal/application/app'
import type { Result, Status } from '@bindings/cull-pear/internal/fontpatch/models'

import { chooseSavePath, pickFiles } from '@/shared/native-kit'

export type FontPatchResult = Result
export type FontPatchStatus = Status

export function getFontPatchStatus(): Promise<FontPatchStatus> {
  return GetFontPatchStatus()
}

export async function pickFont(): Promise<string | undefined> {
  const paths = await pickFiles({
    title: '上传字体并生成补丁',
    filters: [{ displayName: '字体文件（TTF / OTF）', pattern: '*.ttf;*.otf' }],
  })
  return paths[0]
}

export function buildFontPatch(path: string): Promise<FontPatchResult> {
  return BuildFontPatch(path)
}

export function cancelFontPatch(): Promise<void> {
  return CancelFontPatch()
}

export function resetFontPatch(): Promise<void> {
  return ResetFontPatch()
}

export async function saveFontPatch(result: FontPatchResult): Promise<string | undefined> {
  const path = await chooseSavePath({
    title: '保存字体补丁',
    defaultFilename: result.filename.replace(/\.pak$/i, '.zip'),
    filters: [{ displayName: '补丁压缩包（ZIP）', pattern: '*.zip' }],
  })
  if (!path) return undefined
  await SaveFontPatch(result.id, path)
  return path
}
