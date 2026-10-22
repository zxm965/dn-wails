import type { QuickNote } from '../api/quickNotesApi'

export function createNoteSaveQueue(save: (note: QuickNote) => Promise<QuickNote>) {
  const drafts = new Map<number, QuickNote>()
  const requests = new Map<number, Promise<QuickNote>>()
  const deleting = new Set<number>()
  const errors = new Set<number>()
  const savedNotes = new Map<number, QuickNote>()

  function stage(note: QuickNote) {
    if (!deleting.has(note.id)) drafts.set(note.id, note)
  }

  function flush(note: QuickNote): Promise<QuickNote> {
    if (deleting.has(note.id)) return Promise.resolve(note)
    if (!drafts.has(note.id)) stage(note)
    const running = requests.get(note.id)
    if (running) return running
    errors.delete(note.id)
    const request = (async () => {
      let saved = note
      while (drafts.has(note.id) && !deleting.has(note.id)) {
        const current = drafts.get(note.id)!
        saved = await save(current)
        savedNotes.set(note.id, saved)
        // A newer draft is coalesced into the next write, never sent concurrently.
        if (drafts.get(note.id) === current) drafts.delete(note.id)
      }
      return saved
    })()
      .catch((error: unknown) => {
        errors.add(note.id)
        throw error
      })
      .finally(() => requests.delete(note.id))
    requests.set(note.id, request)
    return request
  }

  async function remove(id: number, action: () => Promise<void>) {
    deleting.add(id)
    try {
      // A delete must follow the last in-flight save; failure is retained until deletion succeeds.
      await requests.get(id)?.catch(() => undefined)
      await action()
      drafts.delete(id)
      savedNotes.delete(id)
      errors.delete(id)
    } finally {
      deleting.delete(id)
    }
  }

  return { stage, flush, remove, drafts, errors, savedNotes }
}
