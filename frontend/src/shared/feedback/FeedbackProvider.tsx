import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { AppButton } from '@/shared/components/button'
import { useOverlay } from '@/shared/overlay'

import './FeedbackProvider.css'

export type FeedbackTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  title: string
  message?: string
  tone?: FeedbackTone
  duration?: number
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'tone' | 'duration'>> {
  id: string
  message?: string
}

interface FeedbackContextValue {
  notify: (options: ToastOptions) => string
  dismiss: (id: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

function createToastID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface FeedbackProviderProps {
  children: ReactNode
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const { openOverlay } = useOverlay()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (options: ToastOptions) => {
      const id = createToastID()
      const duration = options.duration ?? 3600
      setToasts((current) => [
        ...current,
        {
          id,
          title: options.title,
          message: options.message,
          tone: options.tone ?? 'info',
          duration,
        },
      ])
      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        openOverlay(
          ({ close }) => {
            const finish = (result: boolean) => {
              close()
              resolve(result)
            }

            return (
              <div className='feedback-confirm'>
                <p>{options.message}</p>
                <div className='feedback-confirm-actions'>
                  <AppButton
                    className='feedback-button feedback-button-secondary'
                    type='button'
                    onClick={() => finish(false)}
                  >
                    {options.cancelLabel ?? '取消'}
                  </AppButton>
                  <AppButton
                    className={`feedback-button ${options.tone === 'danger' ? 'feedback-button-danger' : 'feedback-button-primary'}`}
                    type='button'
                    onClick={() => finish(true)}
                  >
                    {options.confirmLabel ?? '确认'}
                  </AppButton>
                </div>
              </div>
            )
          },
          { title: options.title, size: 'small', dismissible: false },
        )
      }),
    [openOverlay],
  )

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        window.clearTimeout(timer)
      }
      timers.current.clear()
    },
    [],
  )

  const value = useMemo<FeedbackContextValue>(() => ({ notify, dismiss, confirm }), [confirm, dismiss, notify])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {createPortal(
        <div className='feedback-toasts' aria-live='polite' aria-relevant='additions removals'>
          {toasts.map((toast) => (
            <article key={toast.id} className={`feedback-toast is-${toast.tone}`}>
              <div>
                <strong>{toast.title}</strong>
                {toast.message && <p>{toast.message}</p>}
              </div>
              <AppButton size='sm' type='button' aria-label='关闭提示' onClick={() => dismiss(toast.id)}>
                ×
              </AppButton>
            </article>
          ))}
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext)
  if (!value) {
    throw new Error('useFeedback must be used inside FeedbackProvider.')
  }
  return value
}
