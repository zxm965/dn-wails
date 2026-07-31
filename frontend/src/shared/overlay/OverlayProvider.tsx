import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { styles } from './OverlayProvider.css'

const cx = createScopedClassNames(styles)

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

interface OverlayContextValue {
  openOverlay: (render: OverlayRenderer, options?: OverlayOptions) => string
  closeOverlay: (id: string) => void
  closeTopOverlay: () => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

function createOverlayID(): string {
  return globalThis.crypto?.randomUUID?.() ?? `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function dialogSize(size: OverlaySize): DialogSize {
  if (size === 'small') return 'sm'
  if (size === 'large') return 'lg'
  return 'md'
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<OverlayItem[]>([])

  const closeOverlay = useCallback((id: string) => {
    setOverlays((current) => current.filter((overlay) => overlay.id !== id))
  }, [])

  const openOverlay = useCallback((render: OverlayRenderer, options: OverlayOptions = {}) => {
    const id = createOverlayID()
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

  const value = useMemo<OverlayContextValue>(
    () => ({ openOverlay, closeOverlay, closeTopOverlay }),
    [closeOverlay, closeTopOverlay, openOverlay],
  )

  return (
    <OverlayContext.Provider value={value}>
      {children}
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
    </OverlayContext.Provider>
  )
}

export function useOverlay(): OverlayContextValue {
  const value = useContext(OverlayContext)
  if (!value) {
    throw new Error('useOverlay must be used inside OverlayProvider.')
  }
  return value
}
