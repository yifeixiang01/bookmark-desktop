import { expect, it } from 'vitest'
import type { Partition } from '@/types/bookmark'
import { applyNoteAction, migrateNoteHistory } from './state'
import { createNote } from './model'
import { parseStateJSON } from '@/lib/store'

const space = (): Partition => ({ id: 'p', name: '空间', items: [
  { id: 'a', kind: 'app', app: { ...createNote(), text: '第一张' } },
  { id: 'b', kind: 'app', app: { ...createNote(), text: '第二张' } },
] })

it('shares archives within a space and retains them after every note card is removed', () => {
  const p = space()
  applyNoteAction(p, 'a', { type: 'note-archive', id: 'h1' }, 100)
  applyNoteAction(p, 'b', { type: 'note-archive', id: 'h2' }, 200)
  expect(p.noteHistory?.map((h) => h.text)).toEqual(['第二张', '第一张'])
  for (const item of p.items) if (item.kind === 'app' && item.app.type === 'note') expect(item.app.history).toBeUndefined()
  p.items = []
  migrateNoteHistory(p)
  expect(p.noteHistory).toHaveLength(2)
  p.items.push({ id: 'new', kind: 'app', app: createNote() })
  applyNoteAction(p, 'new', { type: 'note-restore', id: 'h1', draftId: 'unused' }, 300)
  expect(p.items[0]).toMatchObject({ app: { text: '第一张' } })
  expect(p.noteHistory).toHaveLength(2)
})

it('isolates archives and explicit history deletion by space', () => {
  const p = space(), q = space()
  applyNoteAction(p, 'a', { type: 'note-archive', id: 'h1' }, 100)
  applyNoteAction(q, 'b', { type: 'note-archive', id: 'h2' }, 200)
  applyNoteAction(q, 'a', { type: 'note-restore', id: 'h1', draftId: 'blocked' }, 300)
  expect(q.items[0]).toMatchObject({ app: { text: '第一张' } })
  expect(q.noteHistory?.map((h) => h.id)).toEqual(['h2'])
  applyNoteAction(q, 'b', { type: 'note-history-delete', id: 'h1' }, 400)
  expect(p.noteHistory).toHaveLength(1)
  applyNoteAction(p, 'b', { type: 'note-history-delete', id: 'h1' }, 500)
  expect(p.noteHistory).toHaveLength(0)
  expect(q.noteHistory).toHaveLength(1)
})

it('merges legacy card archives once without resurrecting explicitly deleted entries', () => {
  const p = space()
  const entry = { id: 'old', text: '旧版归档', color: 'pink' as const, createdAt: 10, archivedAt: 20 }
  for (const item of p.items) if (item.kind === 'app' && item.app.type === 'note') item.app.history = [entry]
  migrateNoteHistory(p)
  migrateNoteHistory(p)
  expect(p.noteHistory).toEqual([entry])
  applyNoteAction(p, 'a', { type: 'note-history-delete', id: 'old' }, 100)
  migrateNoteHistory(p)
  expect(p.noteHistory).toEqual([])
})

it('restoring a shared archive protects only the target draft and survives backup import without cards', () => {
  const p = space()
  applyNoteAction(p, 'a', { type: 'note-archive', id: 'h1' }, 100)
  applyNoteAction(p, 'b', { type: 'note-restore', id: 'h1', draftId: 'h2' }, 200)
  expect(p.items[0]).toMatchObject({ app: { text: '' } })
  expect(p.items[1]).toMatchObject({ app: { text: '第一张' } })
  expect(p.noteHistory?.map((h) => h.text)).toEqual(['第二张', '第一张'])
  p.items = []
  const restored = parseStateJSON(JSON.stringify({ version: 1, partitions: [p], activePartitionId: 'p' }))!
  expect(restored.partitions[0].noteHistory).toEqual(p.noteHistory)
})
