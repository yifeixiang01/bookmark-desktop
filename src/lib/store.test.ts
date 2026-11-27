import { afterEach, describe, expect, it, vi } from 'vitest'
import { allBookmarks, createInitialState, loadState, parseStateJSON } from './store'
import { layoutItems, rectsOverlap, spanOf } from './gridLayout'
import { FONT_OPTIONS } from './fonts'

afterEach(() => vi.unstubAllGlobals())

it('读取旧数据时移除已下线应用，保留书签和其他应用', () => {
  const state = parseStateJSON(JSON.stringify(createInitialState()))!
  const originalItems = state.partitions[0].items
  const json = JSON.stringify({ ...state, partitions: [{ ...state.partitions[0], items: [
    ...originalItems,
    { id: 'retired-app', kind: 'app', app: { type: 'fishpond', weather: 'sunny' } },
  ] }] })
  expect(parseStateJSON(json)?.partitions[0].items).toEqual(originalItems)
  vi.stubGlobal('localStorage', { getItem: () => json })
  expect(loadState().partitions[0].items).toEqual(originalItems)
})

describe('字体偏好兼容与备份', () => {
  it('字号兼容旧数据，限制越界值，并保留有效字号', () => {
    for (const [value, expected] of [[undefined, 100], [null, 100], ['120', 100], [0, 90], [999, 130], [113, 115], [90, 90], [100, 100], [130, 130]] as const) {
      const state = { ...createInitialState(), fontScale: value }
      const json = JSON.stringify(state)
      expect(parseStateJSON(json)?.fontScale).toBe(expected)
      vi.stubGlobal('localStorage', { getItem: () => json })
      expect(loadState().fontScale).toBe(expected)
    }
  })

  it('旧备份与无效字体回退为系统默认，并保留书签', () => {
    const state = parseStateJSON(JSON.stringify(createInitialState()))!
    delete state.font
    for (const value of [undefined, null, 'unknown', { family: 'serif' }]) {
      const json = JSON.stringify({ ...state, font: value })
      const parsed = parseStateJSON(json)
      expect(parsed?.font).toBe('system')
      expect(parsed?.partitions).toEqual(state.partitions)
      vi.stubGlobal('localStorage', { getItem: () => json })
      expect(loadState()?.font).toBe('system')
    }
  })

  it('保留有效偏好，供本地恢复、云端读取和备份导入使用', () => {
    for (const { id: font } of FONT_OPTIONS) {
      const state = { ...parseStateJSON(JSON.stringify(createInitialState()))!, font }
      const json = JSON.stringify(state)
      expect(parseStateJSON(json)).toEqual(state)
      vi.stubGlobal('localStorage', { getItem: () => json })
      expect(loadState()).toEqual(state)
    }
  })
})

describe('首次使用的示例桌面', () => {
  it('在宽屏保持预设布局，在窄屏分页时卡片不重叠且不跨页', () => {
    const items = createInitialState().partitions[0].items
    const desktop = layoutItems(items, 6, 9)
    expect(desktop.cols).toBe(9)
    for (const item of items) expect(desktop.placements.get(item.id)).toEqual(item.pos)
    for (const pageCols of [3, 4, 5, 6, 7, 9, 10, 14]) {
      const { placements } = layoutItems(items, 6, pageCols)
      for (const [index, item] of items.entries()) {
        const position = placements.get(item.id)!
        expect(position.x % pageCols + spanOf(item).w).toBeLessThanOrEqual(pageCols)
        expect(position.y + spanOf(item).h).toBeLessThanOrEqual(6)
        for (const other of items.slice(index + 1)) {
          const otherPosition = placements.get(other.id)!
          expect(rectsOverlap(position.x, position.y, spanOf(item), otherPosition.x, otherPosition.y, spanOf(other))).toBe(false)
        }
      }
    }
  })
  it('创建主页及可用的书签、文件夹和未启动的应用', () => {
    const state = createInitialState()
    const home = state.partitions[0]
    expect(state.partitions).toHaveLength(1)
    expect(home.name).toBe('主页')
    expect(state.activePartitionId).toBe(home.id)
    expect(home.items.some((item) => item.kind === 'bookmark')).toBe(true)
    expect(home.items.some((item) => item.kind === 'group' && item.group.bookmarks.length > 0)).toBe(true)
    for (const bookmark of allBookmarks(home)) expect(new URL(bookmark.url).protocol).toBe('https:')
    expect(home.items.filter((item) => item.kind === 'app').map((item) => item.app.type)).toEqual(['note', 'todo', 'answers'])
    expect(home.items.filter((item) => item.kind === 'bookmark')).toHaveLength(6)
    expect(home.items.filter((item) => item.kind === 'group')).toHaveLength(3)
    expect(home.items.find((item) => item.kind === 'app' && item.app.type === 'answers')).toMatchObject({ app: { answer: null, draws: 0 } })
    const parsed = parseStateJSON(JSON.stringify(state))
    expect(parsed?.partitions[0].name).toBe('主页')
    expect(parsed?.partitions[0].items).toHaveLength(home.items.length)
  })

  it('为不同的新账号分配独立的数据和标识', () => {
    const first = createInitialState()
    const second = createInitialState()
    expect(first.partitions[0].id).not.toBe(second.partitions[0].id)
    first.partitions[0].items.length = 0
    expect(second.partitions[0].items.length).toBeGreaterThan(0)
  })

  it('已有用户即使清空桌面，也不会重新添加示例', () => {
    const existing = createInitialState()
    existing.partitions[0].name = '我的空间'
    existing.partitions[0].items = []
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(existing) })
    expect(loadState()).toEqual(existing)
  })
})
