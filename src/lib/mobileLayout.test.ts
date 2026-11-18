import { describe, expect, it } from 'vitest'
import { mobileItems, moveMobileItem } from './mobileLayout'
import type { Partition } from '@/types/bookmark'

function partition(): Partition {
  return {
    id: 'space',
    name: '主页',
    items: [
      { id: 'a', kind: 'bookmark', bookmark: { id: 'ba', name: 'A', url: 'https://a.test' }, pos: { x: 4, y: 2 } },
      { id: 'app', kind: 'app', app: { type: 'note', text: '', color: 'cream', createdAt: 0 } },
      { id: 'b', kind: 'bookmark', bookmark: { id: 'bb', name: 'B', url: 'https://b.test' }, pos: { x: 0, y: 0 } },
    ],
  }
}

describe('mobile layout', () => {
  it('uses its own order and excludes desktop-only app cards', () => {
    const space = partition()
    space.mobileOrder = ['b', 'missing', 'a']
    expect(mobileItems(space).map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('reorders mobile items without changing desktop positions', () => {
    const space = partition()
    moveMobileItem(space, 'b', -1)
    expect(space.mobileOrder).toEqual(['b', 'a'])
    expect(space.items.find((item) => item.id === 'a')?.pos).toEqual({ x: 4, y: 2 })
    expect(space.items.find((item) => item.id === 'b')?.pos).toEqual({ x: 0, y: 0 })
  })
})
