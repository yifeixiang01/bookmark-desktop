import type { NoteApp, NoteAction } from './types'

export const createNote = (): NoteApp => ({ type: 'note', text: '', color: 'cream', history: [] })

export function actOnNote(current: NoteApp, action: NoteAction, now: number): NoteApp {
  if (action.type === 'note-text') return { ...current, text: action.text.slice(0, 5000), createdAt: current.createdAt ?? (action.text.trim() ? now : undefined) }
  if (action.type === 'note-color') return { ...current, color: action.color }
  if (action.type === 'note-archive') {
    if (!current.text.trim() || current.history?.some((entry) => entry.id === action.id)) return current
    const entry = { id: action.id, text: current.text, color: current.color, createdAt: current.createdAt ?? now, archivedAt: now }
    return { ...current, text: '', createdAt: undefined, history: [entry, ...(current.history ?? [])] }
  }
  if (action.type === 'note-restore') {
    const entry = current.history?.find((item) => item.id === action.id)
    if (!entry || current.history?.some((item) => item.id === action.draftId)) return current
    const draft = current.text.trim() ? [{ id: action.draftId, text: current.text, color: current.color, createdAt: current.createdAt ?? now, archivedAt: now }] : []
    return { ...current, text: entry.text, color: entry.color, createdAt: entry.createdAt, history: [...draft, ...(current.history ?? [])] }
  }
  return current
}
