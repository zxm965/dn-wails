import { useEffect, useState } from 'react'

import { getErrorMessage } from '@/shared/lib/errorMessage'

import { getSourcePreview, getCompositionPreview } from '../api/compositionApi'

export function useCompositionFont(id: string | undefined, source: boolean, busy: boolean) {
  const [loaded, setLoaded] = useState<{ id: string; family: string; points: number[] } | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const ready = !!id && loaded?.id === id
  const canLoad = !!id && (!busy || ready)
  useEffect(() => {
    if (!id || !canLoad) return
    let disposed = false
    let face: FontFace | undefined
    async function load() {
      try {
        const preview = await (source ? getSourcePreview(id!) : getCompositionPreview(id!))
        if (disposed) return
        const bytes = Uint8Array.from(atob(preview.data), (char) => char.charCodeAt(0))
        const family = `Composition-${id}`
        face = new FontFace(family, bytes.buffer)
        await face.load()
        if (disposed) return
        document.fonts.add(face)
        setLoaded({ id: id!, family, points: preview.supportedCodepoints })
        setFailure(null)
      } catch (cause) {
        if (!disposed) setFailure({ id: id!, message: getErrorMessage(cause, '字体预览加载失败。') })
      }
    }
    void load()
    return () => {
      disposed = true
      if (face) document.fonts.delete(face)
    }
  }, [id, source, canLoad, retry])
  return {
    ready,
    family: ready ? loaded.family : undefined,
    points: ready ? loaded.points : [],
    error: failure && failure.id === id ? failure.message : '',
    retry: () => {
      setFailure(null)
      setRetry((value) => value + 1)
    },
  }
}
