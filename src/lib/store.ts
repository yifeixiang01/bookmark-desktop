import type { AppState, Bookmark, DesktopItem, Group, Partition } from '@/types/bookmark'
import { migrateNoteHistory } from '@/apps/note/state'
import { createNote } from '@/apps/note/model'
import { createTodo } from '@/apps/todo/model'
import { createPomodoro } from '@/apps/pomodoro/model'

/**
 * 数据层：localStorage 作为本地缓存（秒开 + 离线可用），
 * 云端同步由 src/hooks/useCloudSync.ts 负责（登录后拉取 / 变更防抖上传）。
 */
const STORAGE_KEY = 'bookmark-desktop-v1'

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

function groupItem(group: Group): DesktopItem {
  return { id: uid(), kind: 'group', group }
}

function bookmarkItem(bookmark: Bookmark): DesktopItem {
  return { id: uid(), kind: 'bookmark', bookmark }
}

function bm(name: string, url: string): Bookmark {
  return { id: uid(), name, url }
}

/** 每次创建独立的示例桌面，仅供无云端数据的新账号和首次本地加载使用。 */
export function createInitialState(): AppState {
  const baidu = bm('百度', 'https://www.baidu.com')
  const zhihu = bm('知乎', 'https://www.zhihu.com')
  const bilibili = bm('B站', 'https://www.bilibili.com')
  const dev: Group = {
    id: uid(),
    name: '学习与探索',
    bookmarks: [
      bm('GitHub', 'https://github.com'),
      bm('掘金', 'https://juejin.cn'),
      bm('MDN', 'https://developer.mozilla.org'),
      bm('StackOverflow', 'https://stackoverflow.com'),
    ],
  }
  const shopping: Group = {
    id: uid(),
    name: '购物',
    bookmarks: [bm('淘宝', 'https://www.taobao.com'), bm('京东', 'https://www.jd.com')],
  }
  const home: Partition = {
    id: uid(),
    name: '主页',
    items: [
      bookmarkItem(baidu),
      bookmarkItem(zhihu),
      bookmarkItem(bilibili),
      groupItem(dev),
      groupItem(shopping),
      {
        id: uid(),
        kind: 'app',
        app: {
          ...createNote(),
          text: '欢迎来到你的书签桌面\n\n• 点击图标打开网站，点击文件夹名称展开收藏。\n• 拖动图标整理位置，叠放两个书签即可创建文件夹。\n• 右键桌面添加书签，右键图标可修改或删除。\n• 在「设置」中更换壁纸、创建空间，或添加更多应用。\n\n这是一张示例便签，可以直接修改，也可以移除。',
          createdAt: Date.now(),
        },
      },
      {
        id: uid(),
        kind: 'app',
        app: {
          ...createTodo(),
          tasks: [
            { id: uid(), text: '打开一个示例书签', done: false },
            { id: uid(), text: '右键桌面，添加常用网站', done: false },
            { id: uid(), text: '在设置里挑选喜欢的壁纸', done: false },
          ],
        },
      },
      { id: uid(), kind: 'app', app: createPomodoro() },
    ],
  }
  return {
    version: 1,
    partitions: [home],
    activePartitionId: home.id,
    wallpaper: 'dusk-ridge',
    searchEngine: 'baidu',
    locked: false,
    iconSize: 'm',
  }
}

/** 旧版结构（partition.groups）迁移为 items 混合布局 */
function migrate(parsed: AppState): AppState {
  for (const p of parsed.partitions as Array<Partition & { groups?: Group[]; dock?: string[] }>) {
    if (!Array.isArray(p.items)) {
      p.items = (p.groups ?? []).map((g) =>
        groupItem(g)
      )
      delete p.groups
    }
    for (const it of p.items) {
      // 旧数据可能带 size 字段（已废弃的小/大文件夹开关），迁移时剔除
      if (it.kind === 'group') delete (it.group as unknown as Record<string, unknown>).size
    }
    // Dock 已移除；读取旧数据时丢弃历史固定记录。
    delete p.dock
    migrateNoteHistory(p)
  }
  parsed.locked ??= false
  parsed.iconSize ??= 'm'
  return parsed
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = migrate(JSON.parse(raw) as AppState)
    if (!parsed.partitions?.length) return createInitialState()
    if (!parsed.partitions.some((p) => p.id === parsed.activePartitionId)) {
      parsed.activePartitionId = parsed.partitions[0].id
    }
    return parsed
  } catch {
    return createInitialState()
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ---------- 查询辅助 ----------

export function allBookmarks(partition: Partition): Bookmark[] {
  const list: Bookmark[] = []
  for (const it of partition.items) {
    if (it.kind === 'bookmark') list.push(it.bookmark)
    else if (it.kind === 'group') list.push(...it.group.bookmarks)
  }
  return list
}

export function findBookmark(
  partition: Partition,
  bookmarkId: string
): { group: Group | null; bookmark: Bookmark } | null {
  for (const it of partition.items) {
    if (it.kind === 'bookmark' && it.bookmark.id === bookmarkId) {
      return { group: null, bookmark: it.bookmark }
    }
    if (it.kind === 'group') {
      const bookmark = it.group.bookmarks.find((b) => b.id === bookmarkId)
      if (bookmark) return { group: it.group, bookmark }
    }
  }
  return null
}

export function exportJSON(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `书签桌面备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function parseStateJSON(text: string): AppState | null {
  try {
    const parsed = migrate(JSON.parse(text) as AppState)
    if (parsed.version !== 1 || !Array.isArray(parsed.partitions) || !parsed.partitions.length) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
