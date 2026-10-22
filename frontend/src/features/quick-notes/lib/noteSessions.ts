import { saveQuickNote } from '../api/quickNotesApi'
import { createNoteSaveQueue } from './noteSaveQueue'

const sessions = new Map<number, ReturnType<typeof createNoteSaveQueue>>()

export function getNoteSession(ownerId: number) {
  let session = sessions.get(ownerId)
  if (!session) {
    session = createNoteSaveQueue(saveQuickNote)
    sessions.set(ownerId, session)
  }
  return session
}
