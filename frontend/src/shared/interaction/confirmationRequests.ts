export function createConfirmationRequests() {
  let sequence = 0
  let pending: { id: number; resolve: (accepted: boolean) => void } | null = null

  function cancel() {
    const previous = pending
    pending = null
    previous?.resolve(false)
  }

  return {
    start() {
      cancel()
      const id = ++sequence
      const promise = new Promise<boolean>((resolve) => {
        pending = { id, resolve }
      })
      return { id, promise }
    },
    finish(id: number, accepted: boolean) {
      if (pending?.id !== id) return false
      const request = pending
      pending = null
      request.resolve(accepted)
      return true
    },
    cancel,
  }
}
