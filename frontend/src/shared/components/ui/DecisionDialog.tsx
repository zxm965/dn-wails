import { useEffect, useRef, useState, type ReactNode } from 'react'

import { AlertDialog } from './AlertDialog'
import { Dialog } from './Dialog'

interface DecisionDialogProps {
  kind?: 'dialog' | 'alert'
  onDecision: (accepted: boolean) => void
  children: (close: (accepted: boolean) => void) => ReactNode
}

// For conditionally mounted dialogs: own the full opening/closing lifecycle so
// callers may unmount immediately when they receive the final decision.
export function DecisionDialog({ kind = 'dialog', onDecision, children }: DecisionDialogProps) {
  const [open, setOpen] = useState(false)
  const decision = useRef<boolean | null>(null)
  const Root = kind === 'alert' ? AlertDialog : Dialog

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  function close(accepted: boolean) {
    if (decision.current !== null) return
    decision.current = accepted
    setOpen(false)
  }

  return (
    <Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close(false)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || decision.current === null) return
        const accepted = decision.current
        decision.current = null
        onDecision(accepted)
      }}
    >
      {children(close)}
    </Root>
  )
}
