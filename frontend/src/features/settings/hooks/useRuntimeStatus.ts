import { useEffect, useSyncExternalStore } from 'react'

import { getRuntimeStatus, type RuntimeStatus } from '@/shared/diagnostics'

interface RuntimeSnapshot {
  status: RuntimeStatus | null
  loading: boolean
  error: string
}

// Keep the last successful snapshot for this WebView session, including across page unmounts.
let snapshot: RuntimeSnapshot = { status: null, loading: true, error: '' }
let pending: Promise<void> | null = null
let lastSuccessAt = 0
const CACHE_TTL_MS = 60_000
const listeners = new Set<() => void>()

function publish(next: RuntimeSnapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

function refresh(force = true): Promise<void> {
  if (pending) return pending
  if (!force && snapshot.status && !snapshot.error && Date.now() - lastSuccessAt < CACHE_TTL_MS)
    return Promise.resolve()
  publish({ ...snapshot, loading: true, error: '' })
  pending = getRuntimeStatus()
    .then(
      (status) => {
        lastSuccessAt = Date.now()
        publish({ status, loading: false, error: '' })
      },
      (error: unknown) =>
        publish({
          ...snapshot,
          loading: false,
          error: error instanceof Error ? error.message : '运行状态读取失败。',
        }),
    )
    .finally(() => {
      pending = null
    })
  return pending
}

export function useRuntimeStatus() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    void refresh(false)
  }, [])
  return { ...current, refresh }
}
