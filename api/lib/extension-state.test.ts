import { describe, it, expect } from 'vitest'
import { addToSpaces, canonicalUrl, defaultState } from './extension-state'

describe('extension bookmark operations', () => {
  it('initializes one empty space and adds the same bookmark to multiple spaces', () => {
    const state = defaultState()
    expect(state.partitions).toHaveLength(1)
    const first = state.partitions[0].id
    state.partitions.push({ id: 'second', name: '工作', items: [] })
    const result = addToSpaces(state, { title: 'Example', url: 'https://example.com', spaceIds: [first, 'second', first] })
    expect(result.added).toEqual([first, 'second'])
    expect(state.partitions.map(p => p.items.length)).toEqual([1, 1])
    expect(addToSpaces(state, { title: 'Again', url: 'https://example.com/', spaceIds: [first, 'second'] }).skipped).toEqual([first, 'second'])
    expect(state.partitions.map(p => p.items.length)).toEqual([1, 1])
  })
  it('checks all selected spaces before mutation', () => {
    const state = defaultState()
    expect(() => addToSpaces(state, { title: 'Test', url: 'https://example.com', spaceIds: [state.partitions[0].id, 'not-owned'] })).toThrow('空间不存在')
    expect(state.partitions[0].items).toHaveLength(0)
  })
  it('recognizes folder copies and retains meaningful query strings and fragments', () => {
    const state = defaultState(), id = state.partitions[0].id
    state.partitions[0].items.push({ id: 'folder', kind: 'group', group: { id: 'group', name: 'Folder', bookmarks: [{ id: 'existing', name: 'Page', url: 'https://example.com/' }] } })
    expect(addToSpaces(state, { title: 'Page', url: 'https://example.com', spaceIds: [id] }).skipped).toEqual([id])
    expect(addToSpaces(state, { title: 'Other', url: 'https://example.com/?page=2#section', spaceIds: [id] }).added).toEqual([id])
    expect(() => canonicalUrl('javascript:alert(1)')).toThrow()
    expect(() => canonicalUrl('file:///secret')).toThrow()
  })
})
