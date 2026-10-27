import { useState, type SetStateAction } from 'react'

// WebView memory only. Callers must include the account ID for private view preferences.
const values = new Map<string, unknown>()

export function useSessionState<T>(key: string, initial: T): [T, (value: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => (values.has(key) ? (values.get(key) as T) : initial))
  const update = (next: SetStateAction<T>) => {
    const previous = values.has(key) ? (values.get(key) as T) : initial
    const result = typeof next === 'function' ? (next as (value: T) => T)(previous) : next
    values.set(key, result)
    setValue(result)
  }
  return [value, update]
}
