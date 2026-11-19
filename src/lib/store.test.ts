import { afterEach, describe, expect, it, vi } from 'vitest'
import { allBookmarks, createInitialState, loadState, parseStateJSON } from './store'

afterEach(() => vi.unstubAllGlobals())

describe('首次使用的示例桌面', () => {
  it('创建主页及可用的书签、文件夹和未启动的应用', () => {
    const state = createInitialState()
    const home = state.partitions[0]
    expect(state.partitions).toHaveLength(1)
    expect(home.name).toBe('主页')
    expect(state.activePartitionId).toBe(home.id)
    expect(home.items.some((item) => item.kind === 'bookmark')).toBe(true)
    expect(home.items.some((item) => item.kind === 'group' && item.group.bookmarks.length > 0)).toBe(true)
    for (const bookmark of allBookmarks(home)) expect(new URL(bookmark.url).protocol).toBe('https:')
    expect(home.items.filter((item) => item.kind === 'app').map((item) => item.app.type)).toEqual(['note', 'todo', 'pomodoro'])
    expect(home.items.find((item) => item.kind === 'app' && item.app.type === 'pomodoro')).toMatchObject({ app: { endsAt: null, completed: 0 } })
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
