import { useEffect, useRef } from 'react'

/** Only the latest request may publish; unmount invalidates all pending results. */
export function useRequestGuard() {
  const sequence = useRef(0)
  useEffect(
    () => () => {
      sequence.current += 1
    },
    [],
  )
  return () => {
    const request = ++sequence.current
    return () => request === sequence.current
  }
}
