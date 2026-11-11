import {
  GetEnhancedFontPatchStatus,
  ImportCompositionFont,
  PreviewFontComposition,
  BuildFontComposition,
  GetCompositionSourcePreview,
  GetCompositionPreview,
  SaveFontComposition,
  CancelFontComposition,
  ResetFontComposition,
} from '@bindings/cull-pear/internal/application/app'
import type {
  CompositionRequest,
  SourceFont,
  EnhancedStatus,
  CompositionStats,
} from '@bindings/cull-pear/internal/fontpatch/models'

import { chooseSavePath, pickFiles } from '@/shared/native-kit'

import type { FontPatchResult } from './fontPatchApi'

export type { CompositionRequest, SourceFont, EnhancedStatus, CompositionStats }
export const getCompositionStatus = GetEnhancedFontPatchStatus
export const importCompositionFont = ImportCompositionFont
export const previewComposition = PreviewFontComposition
export const buildComposition = BuildFontComposition
export const getSourcePreview = GetCompositionSourcePreview
export const getCompositionPreview = GetCompositionPreview
export const cancelComposition = CancelFontComposition
export const resetComposition = ResetFontComposition
export async function chooseCompositionFont(slot: number) {
  const paths = await pickFiles({
    title: `选择字体 ${slot === 0 ? 'A' : 'B'}`,
    filters: [{ displayName: '字体文件（TTF / OTF）', pattern: '*.ttf;*.otf' }],
  })
  return paths[0]
}
export async function saveComposition(result: FontPatchResult) {
  const path = await chooseSavePath({
    title: '保存组合字体补丁',
    defaultFilename: result.filename.replace(/\.pak$/i, '.zip'),
    filters: [{ displayName: '补丁压缩包（ZIP）', pattern: '*.zip' }],
  })
  if (path) await SaveFontComposition(result.id, path)
  return path
}
