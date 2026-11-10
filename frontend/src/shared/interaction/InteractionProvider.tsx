import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  DecisionDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Toaster,
} from '@/shared/components/ui'

import { createConfirmationRequests } from './confirmationRequests'

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
  const [confirmation, setConfirmation] = useState<(ConfirmOptions & { id: number }) | null>(null)
  const [requests] = useState(createConfirmationRequests)

  function finishConfirmation(id: number, confirmed: boolean) {
    if (requests.finish(id, confirmed)) setConfirmation(null)
  }

  function confirm(options: ConfirmOptions): Promise<boolean> {
    const request = requests.start()
    setConfirmation({ ...options, id: request.id })
    return request.promise
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

  useEffect(() => () => requests.cancel(), [requests])

  const value: FeedbackController = { notify, dismiss, confirm }

  return (
    <InteractionContext.Provider value={value}>
      {children}
      <Toaster />
      {confirmation && (
        <DecisionDialog
          key={confirmation.id}
          kind='alert'
          onDecision={(accepted) => finishConfirmation(confirmation.id, accepted)}
        >
          {(close) => (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmation.message}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant='outline' type='button' onClick={() => close(false)}>
                  {confirmation.cancelLabel ?? '取消'}
                </Button>
                <Button
                  variant={confirmation.tone === 'danger' ? 'danger' : 'primary'}
                  type='button'
                  onClick={() => close(true)}
                >
                  {confirmation.confirmLabel ?? '确认'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          )}
        </DecisionDialog>
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
