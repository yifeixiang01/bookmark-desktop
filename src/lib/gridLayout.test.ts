import { expect, it } from 'vitest'
import type { DesktopItem } from '@/types/bookmark'
import { layoutItems, previewInsert } from './gridLayout'

it('reflows offscreen saved positions into available visible cells without changing saved data', () => {
  const items = [icon('a'), icon('b')]
  items[0].pos = { x: 8, y: 0 }
  items[1].pos = { x: 0, y: 0 }
  const { placements } = layoutItems(items, 6, 4)
  expect(placements.get('a')).toEqual({ x: 0, y: 1 })
  expect(placements.get('b')).toEqual({ x: 0, y: 0 })
  expect(items[0].pos).toEqual({ x: 8, y: 0 })
})

it('keeps cards within the visible width and allows overflow when the screen is full', () => {
  const items = Array.from({ length: 6 }, (_, i) => icon(String(i)))
  expect(layoutItems(items, 2, 2).cols).toBe(3)
  const card: DesktopItem = { id: 'card', kind: 'group', pos: { x: 3, y: 0 }, group: { id: 'g', name: 'g', bookmarks: [] } }
  expect(layoutItems([card], 6, 4).placements.get('card')).toEqual({ x: 0, y: 0 })
})

const icon = (id: string): DesktopItem => ({ id, kind: 'bookmark', bookmark: { id, name: id, url: 'https://example.com' } })

it('propagates a nearby vacancy instead of jumping to the first global gap', () => {
  const items = ['source', 'a', 'b'].map(icon)
  const positions = new Map([['source', { x: 10, y: 0 }], ['a', { x: 5, y: 0 }], ['b', { x: 6, y: 0 }]])
  const moved = previewInsert(items, positions, 'source', { w: 1, h: 1 }, { x: 5, y: 0 }, 1)
  expect(moved.get('a')).toEqual({ x: 4, y: 0 })
  expect(moved.has('b')).toBe(false)
})

it('shifts a contiguous chain one cell at a time and reserves the drop cell', () => {
  const items = ['source', 'a', 'b'].map(icon)
  const positions = new Map([['source', { x: 2, y: 0 }], ['a', { x: 0, y: 0 }], ['b', { x: 1, y: 0 }]])
  const moved = previewInsert(items, positions, 'source', { w: 1, h: 1 }, { x: 0, y: 0 }, 1)
  expect(moved.get('a')).toEqual({ x: 1, y: 0 })
  expect(moved.get('b')).toEqual({ x: 2, y: 0 })
  expect(positions.get('a')).toEqual({ x: 0, y: 0 })
})
