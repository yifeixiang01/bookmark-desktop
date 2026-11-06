import { describe, expect, it } from 'vitest'
import type { AppState, Bookmark, Partition } from '@/types/bookmark'
import { containingPartitions, copyBookmark, removeBookmarkCopies, syncBookmark } from './bookmarkActions'
import { allBookmarks } from './store'

const bookmark: Bookmark = { id: 'original', name: 'Example', url: 'https://example.com', icon: 'old.png', description: 'Old' }

function fixture(): AppState {
  const partitions: Partition[] = [
    { id: 'a', name: 'A', dock: ['original'], items: [{ id: 'tile', kind: 'bookmark', pos: { x: 2, y: 1 }, bookmark: { ...bookmark } }] },
    { id: 'b', name: 'B', dock: ['imported'], items: [{ id: 'folder-tile', kind: 'group', group: { id: 'folder', name: 'Folder', bookmarks: [{ ...bookmark, id: 'imported', url: 'https://example.com/' }] } }] },
    { id: 'c', name: 'C', dock: [], items: [] },
  ]
  return { version: 1, partitions, activePartitionId: 'a', wallpaper: '', searchEngine: '', locked: false, iconSize: 'm' }
}

describe('cross-space bookmark actions', () => {
  it('finds existing copies by ID or equivalent URL, including folder contents', () => {
    expect(containingPartitions(fixture(), bookmark).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('copies only to selected other spaces and skips duplicates', () => {
    const state = fixture()
    copyBookmark(state, bookmark, 'a', ['a', 'b', 'c'])
    copyBookmark(state, bookmark, 'a', ['c'])
    expect(state.partitions.map((p) => allBookmarks(p).length)).toEqual([1, 1, 1])
    expect(allBookmarks(state.partitions[2])[0]).toEqual(bookmark)
    expect(allBookmarks(state.partitions[2])[0]).not.toBe(bookmark)
  })

  it('syncs all editable fields even when URL changes, preserving IDs and placement', () => {
    const state = fixture()
    copyBookmark(state, bookmark, 'a', ['c'])
    syncBookmark(state, bookmark, { ...bookmark, name: 'Changed', url: 'https://new.example.com', icon: undefined, description: 'New' })
    expect(state.partitions.map((p) => allBookmarks(p)[0].url)).toEqual(Array(3).fill('https://new.example.com'))
    expect(allBookmarks(state.partitions[1])[0]).toMatchObject({ id: 'imported', name: 'Changed', description: 'New', icon: undefined })
    expect(state.partitions[0].items[0].pos).toEqual({ x: 2, y: 1 })
    expect(state.partitions[1].items[0].kind).toBe('group')
    expect(state.partitions[1].dock).toEqual(['imported'])
  })

  it('deletes locally without touching other spaces, removing stale Dock references', () => {
    const state = fixture()
    removeBookmarkCopies(state.partitions[0], bookmark)
    expect(allBookmarks(state.partitions[0])).toEqual([])
    expect(state.partitions[0].dock).toEqual([])
    expect(allBookmarks(state.partitions[1])).toHaveLength(1)
  })

  it('deletes all copies including folder contents and their Dock references', () => {
    const state = fixture()
    for (const p of state.partitions) removeBookmarkCopies(p, bookmark)
    expect(state.partitions.every((p) => !allBookmarks(p).length && !p.dock.length)).toBe(true)
    expect(state.partitions[1].items).toHaveLength(1)
  })
})
