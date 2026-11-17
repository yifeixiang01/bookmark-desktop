import { expect, it } from 'vitest'
import type { Partition } from '@/types/bookmark'
import { searchBookmarks } from './searchBookmarks'

const spaces: Partition[] = [
  { id: 'a', name: '办公', dock: [], items: [{ id: 'one', kind: 'bookmark', bookmark: { id: 'b', name: 'GitHub', url: 'https://github.com', description: '代码托管' } }] },
  { id: 'c', name: '学习', dock: [], items: [{ id: 'two', kind: 'group', group: { id: 'g', name: '卡片', bookmarks: [{ id: 'b', name: 'GitHub', url: 'https://github.com', description: '代码托管' }] } }] },
]

it('matches partial names, URLs and descriptions across desktop and card bookmarks', () => {
  for (const query of ['gitH', 'hub.com', '托管', 'github 代码']) {
    expect(searchBookmarks(spaces, query).map((r) => r.spaceName)).toEqual(['办公', '学习'])
  }
})

it('ignores blank input and excludes unmatched bookmarks', () => {
  expect(searchBookmarks(spaces, '   ')).toEqual([])
  expect(searchBookmarks(spaces, 'not-found')).toEqual([])
})
