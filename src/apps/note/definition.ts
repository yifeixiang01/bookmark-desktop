import type { DesktopApp, AppAction } from '../types'
import type { NoteApp, NoteAction } from './types'
import { createNote, actOnNote } from './model'

function accepts(action: AppAction): action is NoteAction { return typeof action !== 'string' && action.type.startsWith('note-') }

export const noteDefinition = {
 type: 'note' as const, name: '便签', emoji: '📝', description: '随手记下灵感与重要的事，自动保存。', available: true as const,
 create: (): NoteApp => createNote(),
 preview: (): NoteApp => { return { ...createNote(), text: '灵感备忘\n\n今天也要给自己留一点时间。\n把想做的事，慢慢变成现实。' } },
 settle: (app: DesktopApp): DesktopApp => app,
 act: (app: DesktopApp, action: AppAction, now: number): DesktopApp => app.type === 'note' && accepts(action) ? actOnNote(app, action, now) : app,
}

