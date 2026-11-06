import { useCallback, useState } from 'react'
import type { AppState, Bookmark, GridPos, Group, IconSize, Partition } from '@/types/bookmark'
import { allBookmarks, findBookmark, loadState, saveState, uid } from '@/lib/store'
import { findFreeRect, layoutItems, rectsOverlap, spanOf } from '@/lib/gridLayout'
import { hostHue } from '@/lib/favicon'
import { folderNameFor } from '@/lib/categorize'
import { copyBookmark, removeBookmarkCopies, syncBookmark } from '@/lib/bookmarkActions'

function activeOf(d: AppState): Partition | undefined {
  return d.partitions.find((x) => x.id === d.activePartitionId)
}

/** 从分区任意位置移除一个书签（独立位或文件夹内），返回是否移除过 */
function removeBookmarkEverywhere(p: Partition, bookmarkId: string) {
  p.items = p.items.filter((it) => !(it.kind === 'bookmark' && it.bookmark.id === bookmarkId))
  for (const it of p.items) {
    if (it.kind === 'group') {
      it.group.bookmarks = it.group.bookmarks.filter((b) => b.id !== bookmarkId)
    }
  }
}

export function useBookmarkStore() {
  const [state, setState] = useState<AppState>(loadState)

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      const draft: AppState = JSON.parse(JSON.stringify(prev))
      fn(draft)
      if (!draft.partitions.some((p) => p.id === draft.activePartitionId)) {
        draft.activePartitionId = draft.partitions[0].id
      }
      saveState(draft)
      return draft
    })
  }, [])

  const activePartition =
    state.partitions.find((p) => p.id === state.activePartitionId) ?? state.partitions[0]

  // ---------- 分区 ----------
  const addPartition = useCallback(
    (name: string) => {
      update((d) => {
        const p: Partition = { id: uid(), name: name || '新分区', items: [], dock: [] }
        d.partitions.push(p)
        d.activePartitionId = p.id
      })
    },
    [update]
  )

  const renamePartition = useCallback(
    (id: string, name: string) => update((d) => {
      const p = d.partitions.find((x) => x.id === id)
      if (p && name.trim()) p.name = name.trim()
    }),
    [update]
  )

  const deletePartition = useCallback(
    (id: string) => update((d) => {
      if (d.partitions.length <= 1) return
      d.partitions = d.partitions.filter((x) => x.id !== id)
    }),
    [update]
  )

  const setActivePartition = useCallback(
    (id: string) => update((d) => { d.activePartitionId = id }),
    [update]
  )

  // ---------- 文件夹 ----------
  const addGroup = useCallback(
    (name: string) => update((d) => {
      activeOf(d)?.items.push({
        id: uid(),
        kind: 'group',
        group: { id: uid(), name: name || '新文件夹', bookmarks: [] },
      })
    }),
    [update]
  )

  const renameGroup = useCallback(
    (groupId: string, name: string) => update((d) => {
      const p = activeOf(d)
      const it = p?.items.find((x) => x.kind === 'group' && x.group.id === groupId)
      if (it && it.kind === 'group' && name.trim()) it.group.name = name.trim()
    }),
    [update]
  )

  const deleteGroup = useCallback(
    (groupId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const target = p.items.find((x) => x.kind === 'group' && x.group.id === groupId)
      if (target && target.kind === 'group') {
        const ids = new Set(target.group.bookmarks.map((b) => b.id))
        p.dock = p.dock.filter((bid) => !ids.has(bid))
      }
      p.items = p.items.filter((x) => !(x.kind === 'group' && x.group.id === groupId))
    }),
    [update]
  )

  // ---------- 书签 ----------
  /**
   * 保存书签：groupId 为 null 表示作为独立图标放桌面；
   * 若书签已存在（编辑），先从原位置移除再放入目标位置 —— 天然支持移动。
   */
  const saveBookmark = useCallback(
    (groupId: string | null, bookmark: Bookmark) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const existing = findBookmark(p, bookmark.id)
      if (existing) {
        syncBookmark(d, { ...existing.bookmark }, bookmark)
        if ((existing.group?.id ?? null) === groupId) return
      }
      removeBookmarkEverywhere(p, bookmark.id)
      if (groupId === null) {
        p.items.push({ id: uid(), kind: 'bookmark', bookmark })
      } else {
        const it = p.items.find((x) => x.kind === 'group' && x.group.id === groupId)
        if (it && it.kind === 'group') it.group.bookmarks.push(bookmark)
        else p.items.push({ id: uid(), kind: 'bookmark', bookmark })
      }
    }),
    [update]
  )

  /** 原子操作：新建文件夹并把书签放进去 */
  const saveBookmarkToNewGroup = useCallback(
    (groupName: string, bookmark: Bookmark) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const existing = findBookmark(p, bookmark.id)
      if (existing) syncBookmark(d, { ...existing.bookmark }, bookmark)
      removeBookmarkEverywhere(p, bookmark.id)
      p.items.push({
        id: uid(),
        kind: 'group',
        group: { id: uid(), name: groupName, bookmarks: [bookmark] },
      })
    }),
    [update]
  )

  /** 把书签从文件夹移出为桌面独立图标；可指定目标格（面板拖出时） */
  const moveBookmarkToDesktop = useCallback(
    (bookmarkId: string, pos?: GridPos) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const found = findBookmark(p, bookmarkId)
      if (!found || !found.group) return
      removeBookmarkEverywhere(p, bookmarkId)
      p.items.push({ id: uid(), kind: 'bookmark', bookmark: found.bookmark, ...(pos ? { pos } : {}) })
    }),
    [update]
  )

  /** 把书签移动到指定文件夹（来源可以是桌面独立位或其他文件夹） */
  const moveBookmarkToFolder = useCallback(
    (bookmarkId: string, groupId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const found = findBookmark(p, bookmarkId)
      if (!found || found.group?.id === groupId) return
      removeBookmarkEverywhere(p, bookmarkId)
      const it = p.items.find((i) => i.kind === 'group' && i.group.id === groupId)
      if (it && it.kind === 'group') it.group.bookmarks.push(found.bookmark)
    }),
    [update]
  )

  const deleteBookmark = useCallback(
    (bookmarkId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      removeBookmarkEverywhere(p, bookmarkId)
      p.dock = p.dock.filter((id) => id !== bookmarkId)
    }),
    [update]
  )

  const deleteBookmarkScoped = useCallback(
    (bookmark: Bookmark, sourceId: string, allSpaces: boolean) => update((d) => {
      for (const p of d.partitions) {
        if (allSpaces || p.id === sourceId) removeBookmarkCopies(p, bookmark)
      }
    }),
    [update]
  )

  const copyBookmarkToPartitions = useCallback(
    (bookmark: Bookmark, sourceId: string, targetIds: string[]) => update((d) => {
      copyBookmark(d, bookmark, sourceId, targetIds)
    }),
    [update]
  )

  const toggleDock = useCallback(
    (bookmarkId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      if (p.dock.includes(bookmarkId)) p.dock = p.dock.filter((id) => id !== bookmarkId)
      else if (p.dock.length < 12) p.dock.push(bookmarkId)
    }),
    [update]
  )

  const importGroups = useCallback(
    (groups: Group[]) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const existingUrls = new Set(allBookmarks(p).map((b) => b.url))
      for (const g of groups) {
        g.bookmarks = g.bookmarks.filter((b) => !existingUrls.has(b.url))
        g.bookmarks.forEach((b) => existingUrls.add(b.url))
        if (g.bookmarks.length) {
          p.items.push({ id: uid(), kind: 'group', group: g })
        }
      }
    }),
    [update]
  )

  // ---------- 拖拽 ----------
  /** 自由落位：把桌面项目放到指定格；压到其他项目时优先互换位置，否则为被压项另找空位（rows 为固定行数，列向右不限） */
  const placeItemAt = useCallback(
    (itemId: string, pos: GridPos, rows: number) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const item = p.items.find((i) => i.id === itemId)
      if (!item) return
      const span = spanOf(item)
      const nx = Math.max(0, pos.x)
      const ny = Math.max(0, Math.min(pos.y, Math.max(0, rows - span.h)))

      // 先按当前布局固化所有项目的坐标：没有 pos 的项目由布局引擎自动填充空位，
      // 若不固化，移动任意项目后它们会重新流式补位（后面的图标跟着移动）
      const { placements: current } = layoutItems(p.items, rows)
      for (const it of p.items) {
        const cp = current.get(it.id)
        if (cp) it.pos = { ...cp }
      }

      const others = p.items.filter((i) => i.id !== itemId)
      const { placements } = layoutItems(others, rows)
      const overlapped = others.filter((o) => {
        const op = placements.get(o.id)
        return op && rectsOverlap(nx, ny, span, op.x, op.y, spanOf(o))
      })

      item.pos = { x: nx, y: ny }
      placements.set(itemId, item.pos)
      // 插入式落位（与拖拽悬停"排开"预览一致）：被压到的项目顺推到下一个空位
      for (const o of overlapped) {
        const oSpan = spanOf(o)
        o.pos = findFreeRect(others, placements, rows, oSpan, o.id)
        placements.set(o.id, o.pos)
      }
    }),
    [update]
  )

  /** 拖拽合并：两个桌面独立书签合成一个新文件夹，位置取目标图标所在格 */
  const mergeBookmarks = useCallback(
    (sourceBookmarkId: string, targetBookmarkId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const srcItem = p.items.find((i) => i.kind === 'bookmark' && i.bookmark.id === sourceBookmarkId)
      const tgtItem = p.items.find((i) => i.kind === 'bookmark' && i.bookmark.id === targetBookmarkId)
      if (!srcItem || srcItem.kind !== 'bookmark' || !tgtItem || tgtItem.kind !== 'bookmark') return
      const group: Group = {
        id: uid(),
        name: folderNameFor([tgtItem.bookmark, srcItem.bookmark]),
        bookmarks: [tgtItem.bookmark, srcItem.bookmark],
      }
      const pos = tgtItem.pos
      p.items = p.items.filter((i) => i !== srcItem && i !== tgtItem)
      p.items.push({ id: uid(), kind: 'group', group, ...(pos ? { pos } : {}) })
    }),
    [update]
  )

  /** 拖拽合并：文件夹里的书签拖到桌面独立书签上，合成新文件夹（位置取目标格） */
  const mergeFromFolder = useCallback(
    (bookmarkId: string, targetBookmarkId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const found = findBookmark(p, bookmarkId)
      const tgtItem = p.items.find((i) => i.kind === 'bookmark' && i.bookmark.id === targetBookmarkId)
      if (!found || !found.group || !tgtItem || tgtItem.kind !== 'bookmark') return
      removeBookmarkEverywhere(p, bookmarkId)
      const group: Group = {
        id: uid(),
        name: folderNameFor([tgtItem.bookmark, found.bookmark]),
        bookmarks: [tgtItem.bookmark, found.bookmark],
      }
      const pos = tgtItem.pos
      p.items = p.items.filter((i) => i !== tgtItem)
      p.items.push({ id: uid(), kind: 'group', group, ...(pos ? { pos } : {}) })
    }),
    [update]
  )

  /** 拖拽加入：把桌面独立书签放入已有文件夹 */
  const addBookmarkToFolder = useCallback(
    (bookmarkId: string, groupId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const found = findBookmark(p, bookmarkId)
      if (!found || found.group) return // 只允许桌面独立书签
      removeBookmarkEverywhere(p, bookmarkId)
      const it = p.items.find((i) => i.kind === 'group' && i.group.id === groupId)
      if (it && it.kind === 'group') it.group.bookmarks.push(found.bookmark)
    }),
    [update]
  )

  // ---------- 桌面设置 ----------
  /** 原位更新书签图标（后台重抓高清图标用，不动位置与所在文件夹） */
  const setBookmarkIcon = useCallback(
    (bookmarkId: string, icon: string) => update((d) => {
      for (const p of d.partitions) {
        for (const it of p.items) {
          if (it.kind === 'bookmark' && it.bookmark.id === bookmarkId) {
            it.bookmark.icon = icon
            return
          }
          if (it.kind === 'group') {
            const b = it.group.bookmarks.find((x) => x.id === bookmarkId)
            if (b) {
              b.icon = icon
              return
            }
          }
        }
      }
    }),
    [update]
  )

  const toggleLocked = useCallback(    () => update((d) => { d.locked = !d.locked }),
    [update]
  )

  const setIconSize = useCallback(
    (s: IconSize) => update((d) => { d.iconSize = s }),
    [update]
  )

  /** 智能整理：桌面独立图标按图标色相排序，文件夹保持相对顺序排在后面 */
  const sortByColor = useCallback(
    () => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const standalone = p.items.filter((i) => i.kind === 'bookmark')
      const folders = p.items.filter((i) => i.kind === 'group')
      standalone.sort((a, b) =>
        a.kind === 'bookmark' && b.kind === 'bookmark'
          ? hostHue(a.bookmark.url) - hostHue(b.bookmark.url)
          : 0
      )
      p.items = [...standalone, ...folders]
      // 清除自由位置，让布局引擎按新顺序紧凑重排
      for (const it of p.items) it.pos = undefined
    }),
    [update]
  )

  // ---------- 批量操作（编辑模式勾选） ----------
  const batchDelete = useCallback(
    (ids: string[]) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      for (const id of ids) removeBookmarkEverywhere(p, id)
      p.dock = p.dock.filter((x) => !ids.includes(x))
    }),
    [update]
  )

  const batchMoveToFolder = useCallback(
    (ids: string[], groupId: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const it = p.items.find((i) => i.kind === 'group' && i.group.id === groupId)
      if (!it || it.kind !== 'group') return
      for (const id of ids) {
        const found = findBookmark(p, id)
        if (found && !found.group) {
          removeBookmarkEverywhere(p, id)
          it.group.bookmarks.push(found.bookmark)
        }
      }
    }),
    [update]
  )

  const batchMoveToNewFolder = useCallback(
    (ids: string[], name: string) => update((d) => {
      const p = activeOf(d)
      if (!p) return
      const moved: Bookmark[] = []
      for (const id of ids) {
        const found = findBookmark(p, id)
        if (found && !found.group) {
          removeBookmarkEverywhere(p, id)
          moved.push(found.bookmark)
        }
      }
      if (moved.length) {
        p.items.push({
          id: uid(),
          kind: 'group',
          group: { id: uid(), name, bookmarks: moved },
        })
      }
    }),
    [update]
  )

  const batchMoveToPartition = useCallback(
    (ids: string[], partitionId: string) => update((d) => {
      const from = activeOf(d)
      const to = d.partitions.find((x) => x.id === partitionId)
      if (!from || !to || from.id === to.id) return
      for (const id of ids) {
        const idx = from.items.findIndex((i) => i.kind === 'bookmark' && i.bookmark.id === id)
        if (idx >= 0) {
          const [item] = from.items.splice(idx, 1)
          to.items.push(item)
        }
      }
      from.dock = from.dock.filter((x) => !ids.includes(x))
    }),
    [update]
  )

  const setWallpaper = useCallback(
    (w: string) => update((d) => { d.wallpaper = w }),
    [update]
  )

  const setSearchEngine = useCallback(
    (e: string) => update((d) => { d.searchEngine = e }),
    [update]
  )

  const replaceState = useCallback((next: AppState) => {
    saveState(next)
    setState(next)
  }, [])

  return {
    state,
    activePartition,
    findBookmark: (bid: string) => findBookmark(activePartition, bid),
    addPartition, renamePartition, deletePartition, setActivePartition,
    addGroup, renameGroup, deleteGroup,
    saveBookmark, saveBookmarkToNewGroup, moveBookmarkToDesktop, moveBookmarkToFolder, deleteBookmark,
    toggleDock, importGroups,
    deleteBookmarkScoped, copyBookmarkToPartitions,
    placeItemAt, mergeBookmarks, mergeFromFolder, addBookmarkToFolder,
    toggleLocked, setIconSize, sortByColor, setBookmarkIcon,
    batchDelete, batchMoveToFolder, batchMoveToNewFolder, batchMoveToPartition,
    setWallpaper, setSearchEngine, replaceState,
  }
}

export type BookmarkStore = ReturnType<typeof useBookmarkStore>
