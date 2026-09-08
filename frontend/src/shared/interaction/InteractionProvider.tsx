import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogSize,
  Toaster,
} from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './InteractionProvider.css'

const cx = createScopedClassNames(styles)

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

export type OverlaySize = 'small' | 'medium' | 'large'

export interface OverlayController {
  close: () => void
}

export interface OverlayOptions {
  title?: string
  size?: OverlaySize
  dismissible?: boolean
}

type OverlayRenderer = (controller: OverlayController) => ReactNode

interface OverlayItem {
  id: string
  render: OverlayRenderer
  options: Required<Pick<OverlayOptions, 'size' | 'dismissible'>> & Pick<OverlayOptions, 'title'>
}

interface FeedbackController {
  notify: (options: ToastOptions) => string
  dismiss: (id: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

interface OverlayContextController {
  openOverlay: (render: OverlayRenderer, options?: OverlayOptions) => string
  closeOverlay: (id: string) => void
  closeTopOverlay: () => void
}

type InteractionContextValue = FeedbackController & OverlayContextController

const InteractionContext = createContext<InteractionContextValue | null>(null)

function createInteractionID(kind: 'feedback' | 'overlay'): string {
  return globalThis.crypto?.randomUUID?.() ?? `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function dialogSize(size: OverlaySize): DialogSize {
  if (size === 'small') return 'sm'
  if (size === 'large') return 'lg'
  return 'md'
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null)
  const [overlays, setOverlays] = useState<OverlayItem[]>([])
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
    const id = createInteractionID('feedback')
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

  const closeOverlay = useCallback((id: string) => {
    setOverlays((current) => current.filter((overlay) => overlay.id !== id))
  }, [])

  const openOverlay = useCallback((render: OverlayRenderer, options: OverlayOptions = {}) => {
    const id = createInteractionID('overlay')
    setOverlays((current) => [
      ...current,
      {
        id,
        render,
        options: {
          title: options.title,
          size: options.size ?? 'medium',
          dismissible: options.dismissible ?? true,
        },
      },
    ])
    return id
  }, [])

  const closeTopOverlay = useCallback(() => {
    setOverlays((current) => {
      const top = current.at(-1)
      return top?.options.dismissible ? current.slice(0, -1) : current
    })
  }, [])

  useEffect(
    () => () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    },
    [],
  )

  const value = useMemo<InteractionContextValue>(
    () => ({ notify, dismiss, confirm, openOverlay, closeOverlay, closeTopOverlay }),
    [closeOverlay, closeTopOverlay, confirm, dismiss, notify, openOverlay],
  )

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
      {overlays.map((overlay) => (
        <Dialog
          key={overlay.id}
          open
          onOpenChange={(open) => {
            if (!open && overlay.options.dismissible) {
              closeOverlay(overlay.id)
            }
          }}
        >
          <DialogContent size={dialogSize(overlay.options.size)} showCloseButton={overlay.options.dismissible}>
            {overlay.options.title && (
              <DialogHeader>
                <DialogTitle>{overlay.options.title}</DialogTitle>
                <DialogDescription>应用内子视图</DialogDescription>
              </DialogHeader>
            )}
            <DialogBody className={cx('overlay-content')}>
              {overlay.render({ close: () => closeOverlay(overlay.id) })}
            </DialogBody>
          </DialogContent>
        </Dialog>
      ))}
    </InteractionContext.Provider>
  )
}

function useInteraction(): InteractionContextValue {
  const value = useContext(InteractionContext)
  if (!value) {
    throw new Error('Interaction hooks must be used inside InteractionProvider.')
  }
  return value
}

export function useFeedback(): FeedbackController {
  return useInteraction()
}

export function useOverlay(): OverlayContextController {
  return useInteraction()
}
