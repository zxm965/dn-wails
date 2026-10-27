import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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

interface FeedbackController {
  notify: (options: ToastOptions) => string
  dismiss: (id: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const InteractionContext = createContext<FeedbackController | null>(null)

function createFeedbackID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  function finishConfirmation(confirmed: boolean) {
    resolverRef.current?.(confirmed)
    resolverRef.current = null
    setConfirmation(null)
  }

  function confirm(options: ConfirmOptions): Promise<boolean> {
    resolverRef.current?.(false)
    setConfirmation(options)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  function notify(options: ToastOptions): string {
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
  }

  function dismiss(id: string) {
    toast.dismiss(id)
  }

  useEffect(
    () => () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    },
    [],
  )

  const value: FeedbackController = { notify, dismiss, confirm }

  return (
    <InteractionContext.Provider value={value}>
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
              <Button variant='outline' type='button' onClick={() => finishConfirmation(false)}>
                {confirmation.cancelLabel ?? '取消'}
              </Button>
              <Button
                variant={confirmation.tone === 'danger' ? 'danger' : 'primary'}
                type='button'
                onClick={() => finishConfirmation(true)}
              >
                {confirmation.confirmLabel ?? '确认'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </InteractionContext.Provider>
  )
}

export function useFeedback(): FeedbackController {
  const value = useContext(InteractionContext)
  if (!value) {
    throw new Error('Interaction hooks must be used inside InteractionProvider.')
  }
  return value
}
