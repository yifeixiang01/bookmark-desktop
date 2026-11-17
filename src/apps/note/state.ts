import type { Partition } from '@/types/bookmark'
import type { NoteAction } from './types'
import { actOnNote } from './model'

/** Move legacy card-owned archives into a single space-owned collection. */
export function migrateNoteHistory(space: Partition) {
  const entries = new Map((space.noteHistory ?? []).map((entry) => [entry.id, entry]))
  let hasNotes = false
  for (const item of space.items) {
    if (item.kind !== 'app' || item.app.type !== 'note') continue
    hasNotes = true
    for (const entry of item.app.history ?? []) if (!entries.has(entry.id)) entries.set(entry.id, entry)
    delete item.app.history
  }
  if (hasNotes || space.noteHistory) space.noteHistory = [...entries.values()].sort((a, b) => b.archivedAt - a.archivedAt)
}

export function applyNoteAction(space: Partition, itemId: string, action: NoteAction, now: number) {
  migrateNoteHistory(space)
  const item = space.items.find((candidate) => candidate.id === itemId)
  if (item?.kind !== 'app' || item.app.type !== 'note') return
  if (action.type === 'note-history-delete') {
    space.noteHistory = (space.noteHistory ?? []).filter((entry) => entry.id !== action.id)
    return
  }
  const next = actOnNote({ ...item.app, history: space.noteHistory ?? [] }, action, now)
  space.noteHistory = next.history ?? []
  item.app = { ...next }
  delete item.app.history
}
