import { expect, it } from 'vitest'
import type { DesktopItem } from '@/types/bookmark'
import { previewInsert } from './gridLayout'

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
