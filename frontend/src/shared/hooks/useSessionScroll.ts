import { useLayoutEffect, type RefObject } from 'react'

const offsets = new Map<string, number>()

export function useSessionScroll(ref: RefObject<HTMLElement | null>, key: string, ready: boolean) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!ready || !element) return
    element.scrollTop = offsets.get(key) ?? 0
    const remember = () => offsets.set(key, element.scrollTop)
    element.addEventListener('scroll', remember, { passive: true })
    return () => element.removeEventListener('scroll', remember)
  }, [ref, key, ready])
}
