import { expect, it } from 'vitest'
import { actOnApp, createApp } from '@/apps'
import { parseStateJSON } from '@/lib/store'
import type { AppState, NoteApp } from '@/types/bookmark'

  it('archives legacy notes without losing text or color and starts an empty draft', () => {
    const legacy: NoteApp = { type: 'note', text: '昨天的记录\n第二行', color: 'pink' }
    const archived = actOnApp(legacy, { type: 'note-archive', id: 'old' }, 1000)
    expect(archived).toMatchObject({ text: '', color: 'pink', history: [{ id: 'old', text: legacy.text, color: 'pink', createdAt: 1000, archivedAt: 1000 }] })
    expect(legacy.history).toBeUndefined()
    expect(legacy.text).toBe('昨天的记录\n第二行')
    expect(actOnApp(archived, { type: 'note-archive', id: 'empty' }, 2000)).toBe(archived)
  })

  it('records first draft time, keeps history through edits and protects the current draft on restore', () => {
    const written = actOnApp(createApp('note'), { type: 'note-text', text: '第一天' }, 1000)
    const edited = actOnApp(written, { type: 'note-text', text: '第一天的计划' }, 1500)
    expect(edited).toMatchObject({ createdAt: 1000 })
    const archived = actOnApp(edited, { type: 'note-archive', id: 'first' }, 2000)
    const newDraft = actOnApp(archived, { type: 'note-text', text: '第二天的内容' }, 3000)
    const restored = actOnApp(newDraft, { type: 'note-restore', id: 'first', draftId: 'second' }, 4000) as NoteApp
    expect(restored.text).toBe('第一天的计划')
    expect(restored.createdAt).toBe(1000)
    expect(restored.history).toEqual([
      { id: 'second', text: '第二天的内容', color: 'cream', createdAt: 3000, archivedAt: 4000 },
      { id: 'first', text: '第一天的计划', color: 'cream', createdAt: 1000, archivedAt: 2000 },
    ])
    expect(actOnApp(newDraft, { type: 'note-restore', id: 'missing', draftId: 'lost' }, 4000)).toBe(newDraft)
    expect(actOnApp(restored, { type: 'note-restore', id: 'first', draftId: 'second' }, 5000)).toBe(restored)
    const blank = { ...restored, text: '' }
    expect((actOnApp(blank, { type: 'note-restore', id: 'first', draftId: 'unused' }, 5000) as NoteApp).history).toHaveLength(2)
  })

  it('preserves dated archives through backup export/import', () => {
    const note = actOnApp({ type: 'note', text: '保留往日便签', color: 'green', createdAt: 100 }, { type: 'note-archive', id: 'saved' }, 200)
    const state: AppState = { version: 1, activePartitionId: 'p', wallpaper: 'dusk-ridge', searchEngine: 'baidu', locked: false, iconSize: 'm', partitions: [{ id: 'p', name: '主页', dock: [], items: [{ id: 'note', kind: 'app', app: note }] }] }
    expect(parseStateJSON(JSON.stringify(state))?.partitions[0].items[0]).toEqual(state.partitions[0].items[0])
  })

  it('keeps notes independent and bounds note content length', () => {
    const first = createApp('note'), second = createApp('note')
    const updated = actOnApp(first, { type: 'note-text', text: 'x'.repeat(6000) }, 0)
    expect(updated).toMatchObject({ text: 'x'.repeat(5000) })
    expect(second).toMatchObject({ text: '', color: 'cream' })
    expect(actOnApp(updated, { type: 'note-color', color: 'pink' }, 0)).toMatchObject({ color: 'pink' })
  })
