import type { AppState, Bookmark, DesktopItem, Group, Partition } from '@/types/bookmark'
import { isAppType } from '@/apps/registry'
import { migrateNoteHistory } from '@/apps/note/state'
import { createInitialState } from './initialState'
import { normalizeFont, normalizeFontScale } from './fonts'
export { createInitialState } from './initialState'

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

/** 旧版结构（partition.groups）迁移为 items 混合布局 */
function migrate(parsed: AppState): AppState {
  for (const p of parsed.partitions as Array<Partition & { groups?: Group[]; dock?: string[] }>) {
    if (!Array.isArray(p.items)) {
      p.items = (p.groups ?? []).map((g) =>
        groupItem(g)
      )
      delete p.groups
    }
    // 丢弃已下线应用的旧记录，兼容本地缓存、云端数据和备份。
    p.items = p.items.filter((item) => item.kind !== 'app' || isAppType(item.app.type))
    for (const it of p.items) {
      // 旧数据可能带 size 字段（已废弃的小/大文件夹开关），迁移时剔除
      if (it.kind === 'group') delete (it.group as unknown as Record<string, unknown>).size
    }
    // Dock 已移除；读取旧数据时丢弃历史固定记录。
    delete p.dock
    if (p.petEnabled !== true) delete p.petEnabled
    migrateNoteHistory(p)
  }
  parsed.locked ??= false
  parsed.iconSize ??= 'm'
  parsed.font = normalizeFont(parsed.font)
  parsed.fontScale = normalizeFontScale(parsed.fontScale)
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
