import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import './OverlayProvider.css'

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

interface OverlayProviderProps {
  children: ReactNode
}

export function OverlayProvider({ children }: OverlayProviderProps) {
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
      if (!top?.options.dismissible) {
        return current
      }
      return current.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    if (overlays.length === 0) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTopOverlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeTopOverlay, overlays.length])

  const value = useMemo<OverlayContextValue>(
    () => ({ openOverlay, closeOverlay, closeTopOverlay }),
    [closeOverlay, closeTopOverlay, openOverlay],
  )

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {createPortal(
        <div className='overlay-stack' aria-live='polite'>
          {overlays.map((overlay, index) => (
            <OverlayFrame
              key={overlay.id}
              overlay={overlay}
              isTop={index === overlays.length - 1}
              onClose={() => closeOverlay(overlay.id)}
            />
          ))}
        </div>,
        document.body,
      )}
    </OverlayContext.Provider>
  )
}

interface OverlayFrameProps {
  overlay: OverlayItem
  isTop: boolean
  onClose: () => void
}

function OverlayFrame({ overlay, isTop, onClose }: OverlayFrameProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isTop) {
      dialogRef.current?.focus()
    }
  }, [isTop])

  return (
    <div
      className='overlay-backdrop'
      style={{ zIndex: 1000 + Number(isTop) }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && overlay.options.dismissible) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`overlay-dialog overlay-dialog-${overlay.options.size}`}
        role='dialog'
        aria-modal='true'
        aria-label={overlay.options.title ?? '对话框'}
        tabIndex={-1}
      >
        {(overlay.options.title || overlay.options.dismissible) && (
          <header className='overlay-header'>
            <h2>{overlay.options.title}</h2>
            {overlay.options.dismissible && (
              <button className='overlay-close' type='button' aria-label='关闭' onClick={onClose}>
                ×
              </button>
            )}
          </header>
        )}
        <div className='overlay-content'>{overlay.render({ close: onClose })}</div>
      </div>
    </div>
  )
}

export function useOverlay(): OverlayContextValue {
  const value = useContext(OverlayContext)
  if (!value) {
    throw new Error('useOverlay must be used inside OverlayProvider.')
  }
  return value
}
