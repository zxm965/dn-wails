import { useEffect, useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react'

interface Position {
  x: number
  y: number
}

export interface ListMotionOrigin {
  key: string
  left: number
  top: number
}

/** Animate non-nested data-motion-key elements when their layout order changes. */
export function useListMotion(order: string, dropOrigin?: RefObject<ListMotionOrigin | null>) {
  const ref = useRef<HTMLDivElement>(null)
  const positions = useRef(new Map<string, Position>())
  const animations = useRef(new Map<HTMLElement, Animation>())

  const lastOrder = useRef(order)
  const capture = useEffectEvent(() => {
    const root = ref.current
    if (!root) return
    const origin = root.getBoundingClientRect()
    const next = new Map<string, Position>()
    for (const element of root.querySelectorAll<HTMLElement>('[data-motion-key]')) {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      const transform = animations.current.has(element)
        ? new DOMMatrixReadOnly(getComputedStyle(element).transform)
        : null
      next.set(element.dataset.motionKey!, {
        x: rect.left - origin.left + root.scrollLeft - (transform?.m41 ?? 0),
        y: rect.top - origin.top + root.scrollTop - (transform?.m42 ?? 0),
      })
    }
    positions.current = next
  })

  useLayoutEffect(() => {
    if (lastOrder.current === order) {
      capture()
      return
    }
    lastOrder.current = order
    const dropped = dropOrigin?.current
    if (dropOrigin) dropOrigin.current = null
    const root = ref.current
    if (!root) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const origin = root.getBoundingClientRect()
    const next = new Map<string, Position>()
    const moves: Array<{ element: HTMLElement; x: number; y: number }> = []
    for (const element of root.querySelectorAll<HTMLElement>('[data-motion-key]')) {
      const key = element.dataset.motionKey!
      const previous =
        dropped?.key === key
          ? { x: dropped.left - origin.left + root.scrollLeft, y: dropped.top - origin.top + root.scrollTop }
          : positions.current.get(key)
      const running = animations.current.get(element)
      const transform =
        running && dropped?.key !== key ? new DOMMatrixReadOnly(getComputedStyle(element).transform) : null
      running?.cancel()
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const position = { x: rect.left - origin.left + root.scrollLeft, y: rect.top - origin.top + root.scrollTop }
      next.set(key, position)
      if (previous && !reducedMotion) {
        moves.push({
          element,
          x: previous.x + (transform?.m41 ?? 0) - position.x,
          y: previous.y + (transform?.m42 ?? 0) - position.y,
        })
      }
    }
    for (const animation of animations.current.values()) animation.cancel()
    animations.current.clear()
    positions.current = next
    for (const { element, x, y } of moves) {
      if (Math.abs(x) < 1 && Math.abs(y) < 1) continue
      const animation = element.animate(
        [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
        {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        },
      )
      animations.current.set(element, animation)
      animation.onfinish = () => animations.current.delete(element)
    }
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cancel = () => {
      for (const animation of animations.current.values()) animation.cancel()
      animations.current.clear()
    }
    const onChange = () => {
      if (media.matches) cancel()
    }
    media.addEventListener('change', onChange)
    const root = ref.current
    const resize = new ResizeObserver(capture)
    if (root) {
      resize.observe(root)
      root.addEventListener('transitionend', capture)
    }
    window.addEventListener('resize', capture)
    return () => {
      media.removeEventListener('change', onChange)
      resize.disconnect()
      root?.removeEventListener('transitionend', capture)
      window.removeEventListener('resize', capture)
      cancel()
    }
  }, [])
  return ref
}
