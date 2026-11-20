import { expect, it } from 'vitest'
import type { DesktopItem } from '@/types/bookmark'
import { dragVisualOf, layoutItems, previewInsert, rectsOverlap, removeGroupPreservingLayout, spanOf } from './gridLayout'
import { createPomodoro } from '@/apps/pomodoro/model'
import { createSalary } from '@/apps/salary/model'

it('keeps a four-column salary card inside its page and reserves its wider footprint', () => {
  const salary: DesktopItem = { id: 'salary', kind: 'app', app: createSalary(), pos: { x: 3, y: 0 } }
  const items = [salary, ...Array.from({ length: 10 }, (_, i) => icon(`salary-neighbor-${i}`))]
  const { placements } = layoutItems(items, 6, 5)
  const position = placements.get(salary.id)!
  expect(spanOf(salary)).toEqual({ w: 4, h: 4 })
  expect(dragVisualOf(salary, 56)).toMatchObject({ w: 368, h: 432 })
  expect(position.x % 5 + 4).toBeLessThanOrEqual(5)
  for (const neighbor of items.slice(1)) {
    const p = placements.get(neighbor.id)!
    expect(rectsOverlap(position.x, position.y, spanOf(salary), p.x, p.y, spanOf(neighbor))).toBe(false)
  }
})

it('keeps automatically placed cards and icons stationary after deleting an earlier card', () => {
  const items: DesktopItem[] = [
    { id: 'first', kind: 'group', group: { id: 'g1', name: 'First', bookmarks: [] } },
    { id: 'second', kind: 'group', group: { id: 'g2', name: 'Second', bookmarks: [] } },
    icon('bookmark'),
  ]
  const before = layoutItems(items, 6, 4).placements
  const remaining = removeGroupPreservingLayout(items, 'g1', 6, 4)
  const after = layoutItems(remaining, 6, 4).placements
  expect(remaining).toHaveLength(2)
  for (const item of remaining) expect(after.get(item.id)).toEqual(before.get(item.id))
  expect(items[1].pos).toBeUndefined()
})

it('preserves saved positions beyond the viewport instead of moving them to the first empty cell', () => {
  const items = [icon('a'), icon('b')]
  items[0].pos = { x: 8, y: 0 }
  items[1].pos = { x: 0, y: 0 }
  const { placements, cols } = layoutItems(items, 6)
  expect(placements.get('a')).toEqual({ x: 8, y: 0 })
  expect(cols).toBe(9)
  expect(placements.get('b')).toEqual({ x: 0, y: 0 })
  expect(items[0].pos).toEqual({ x: 8, y: 0 })
})

it('preserves a card straddling the right edge and grows the scrollable grid', () => {
  const items = Array.from({ length: 6 }, (_, i) => icon(String(i)))
  expect(layoutItems(items, 2).cols).toBe(3)
  const card: DesktopItem = { id: 'card', kind: 'group', pos: { x: 3, y: 0 }, group: { id: 'g', name: 'g', bookmarks: [] } }
  expect(layoutItems([card], 6).placements.get('card')).toEqual({ x: 3, y: 0 })
  expect(layoutItems([card], 6).cols).toBe(5)
})

it('keeps multi-column items entirely inside a responsive page', () => {
  const group: DesktopItem = { id: 'group', kind: 'group', pos: { x: 4, y: 0 }, group: { id: 'g', name: 'g', bookmarks: [] } }
  const app: DesktopItem = { id: 'app', kind: 'app', pos: { x: 9, y: 0 }, app: createPomodoro() }
  const { placements } = layoutItems([group, app], 7, 5)
  for (const item of [group, app]) {
    const position = placements.get(item.id)!
    expect(position.x % 5 + spanOf(item).w).toBeLessThanOrEqual(5)
  }
})

const icon = (id: string): DesktopItem => ({ id, kind: 'bookmark', bookmark: { id, name: id, url: 'https://example.com' } })

it('reserves nine slots for an app and places bookmarks outside its footprint', () => {
  const app: DesktopItem = { id: 'app', kind: 'app', app: createPomodoro(), pos: { x: 0, y: 0 } }
  const items = [app, ...Array.from({ length: 18 }, (_, i) => icon(String(i)))]
  const { placements } = layoutItems(items, 6)
  expect(spanOf(app)).toEqual({ w: 3, h: 3 })
  for (const it of items.slice(1)) {
    const p = placements.get(it.id)!
    expect(rectsOverlap(0, 0, spanOf(app), p.x, p.y, spanOf(it))).toBe(false)
  }
})

it('keeps a 3x3 app at the far right after persisting and reloading its placement', () => {
  const app: DesktopItem = { id: 'app', kind: 'app', app: createPomodoro(), pos: { x: 12, y: 3 } }
  const items = [icon('a'), app]
  const restored: DesktopItem[] = JSON.parse(JSON.stringify(items))
  const { placements, cols } = layoutItems(restored, 6)
  expect(placements.get('app')).toEqual({ x: 12, y: 3 })
  expect(cols).toBe(15)
})

it('still relocates invalid vertical positions and overlapping items', () => {
  const items = [icon('a'), icon('b'), icon('c')]
  items[0].pos = { x: 8, y: 0 }
  items[1].pos = { x: 8, y: 0 }
  items[2].pos = { x: 8, y: 6 }
  const { placements } = layoutItems(items, 6)
  expect(placements.get('a')).toEqual({ x: 8, y: 0 })
  expect(placements.get('b')).toEqual({ x: 0, y: 0 })
  expect(placements.get('c')).toEqual({ x: 0, y: 1 })
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
