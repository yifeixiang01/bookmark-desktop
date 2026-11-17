import { expect, it } from 'vitest'
import type { DesktopItem } from '@/types/bookmark'
import { layoutItems, previewInsert, rectsOverlap, spanOf } from './gridLayout'
import { createPomodoro } from './desktopApps'

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

it('reserves nine slots for an app and places bookmarks outside its footprint', () => {
  const app: DesktopItem = { id: 'app', kind: 'app', app: createPomodoro(), pos: { x: 0, y: 0 } }
  const items = [app, ...Array.from({ length: 18 }, (_, i) => icon(String(i)))]
  const { placements } = layoutItems(items, 6, 5)
  expect(spanOf(app)).toEqual({ w: 3, h: 3 })
  for (const it of items.slice(1)) {
    const p = placements.get(it.id)!
    expect(rectsOverlap(0, 0, spanOf(app), p.x, p.y, spanOf(it))).toBe(false)
  }
})

it('moves a large app aside when a bookmark is dropped on it without creating overlaps', () => {
  const app: DesktopItem = { id: 'app', kind: 'app', app: createPomodoro() }
  const items = [app, icon('source'), icon('other')]
  const positions = new Map([['app', { x: 0, y: 0 }], ['source', { x: 3, y: 0 }], ['other', { x: 3, y: 1 }]])
  const cell = { x: 1, y: 1 }
  const moved = previewInsert(items, positions, 'source', { w: 1, h: 1 }, cell, 6)
  const target = moved.get('app')!
  expect(target).toBeDefined()
  expect(rectsOverlap(target.x, target.y, spanOf(app), cell.x, cell.y, { w: 1, h: 1 })).toBe(false)
  const other = positions.get('other')!
  expect(rectsOverlap(target.x, target.y, spanOf(app), other.x, other.y, { w: 1, h: 1 })).toBe(false)
})

it('reserves the whole app footprint while displacing a dense block of icons', () => {
  const app: DesktopItem = { id: 'app', kind: 'app', app: createPomodoro() }
  const icons = Array.from({ length: 18 }, (_, i) => icon(String(i)))
  const items = [app, ...icons]
  const positions = new Map([['app', { x: 3, y: 0 }], ...icons.map((it, i) => [it.id, { x: Math.floor(i / 6), y: i % 6 }] as const)])
  const moved = previewInsert(items, positions, 'app', spanOf(app), { x: 0, y: 0 }, 6)
  const final = new Map([...positions, ...moved, ['app', { x: 0, y: 0 }] as const])
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = final.get(items[i].id)!, b = final.get(items[j].id)!
    expect(rectsOverlap(a.x, a.y, spanOf(items[i]), b.x, b.y, spanOf(items[j]))).toBe(false)
  }
})

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
