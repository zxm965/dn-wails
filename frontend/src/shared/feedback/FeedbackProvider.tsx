import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AppButton } from '@/shared/components/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Toaster,
} from '@/shared/components/ui'

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

interface FeedbackContextValue {
  notify: (options: ToastOptions) => string
  dismiss: (id: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

function createFeedbackID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const finishConfirmation = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed)
    resolverRef.current = null
    setConfirmation(null)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    resolverRef.current?.(false)
    setConfirmation(options)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const notify = useCallback((options: ToastOptions) => {
    const id = createFeedbackID()
    const toastOptions = {
      id,
      description: options.message,
      duration: options.duration ?? 3600,
    }
    const tone = options.tone ?? 'info'
    if (tone === 'success') {
      toast.success(options.title, toastOptions)
    } else if (tone === 'warning') {
      toast.warning(options.title, toastOptions)
    } else if (tone === 'error') {
      toast.error(options.title, toastOptions)
    } else {
      toast.info(options.title, toastOptions)
    }
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    toast.dismiss(id)
  }, [])

  useEffect(
    () => () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    },
    [],
  )

  const value = useMemo<FeedbackContextValue>(() => ({ notify, dismiss, confirm }), [confirm, dismiss, notify])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toaster />
      {confirmation && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && resolverRef.current) {
              finishConfirmation(false)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmation.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AppButton variant='outline' type='button' onClick={() => finishConfirmation(false)}>
                {confirmation.cancelLabel ?? '取消'}
              </AppButton>
              <AppButton
                variant={confirmation.tone === 'danger' ? 'danger' : 'primary'}
                type='button'
                onClick={() => finishConfirmation(true)}
              >
                {confirmation.confirmLabel ?? '确认'}
              </AppButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
