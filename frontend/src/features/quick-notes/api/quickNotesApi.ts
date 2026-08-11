import { DeleteQuickNote, ListQuickNotes, SaveQuickNote } from '@bindings/dn-wails/internal/application/app'
import * as WailsQuickNotes from '@bindings/dn-wails/internal/quicknotes/models'

export interface QuickNote {
  id: number
  title: string
  content: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface QuickNoteInput {
  id: number
  title: string
  content: string
  pinned: boolean
}

function normalizeNote(value: WailsQuickNotes.Note): QuickNote {
  return {
    id: value.id,
    title: value.title,
    content: value.content,
    pinned: value.pinned,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export async function listQuickNotes(): Promise<QuickNote[]> {
  return (await ListQuickNotes()).map(normalizeNote)
}

export async function saveQuickNote(input: QuickNoteInput): Promise<QuickNote> {
  return normalizeNote(await SaveQuickNote(WailsQuickNotes.NoteInput.createFrom(input)))
}

export function deleteQuickNote(id: number): Promise<void> {
  return DeleteQuickNote(id)
}
