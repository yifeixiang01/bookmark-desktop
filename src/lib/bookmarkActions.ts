import type { AppState, Bookmark, Partition } from '@/types/bookmark'
import { allBookmarks, uid } from './store'

function canonicalUrl(url: string) {
  try { return new URL(url).href } catch { return url.trim() }
}

export function sameBookmark(a: Bookmark, b: Bookmark) {
  return a.id === b.id || canonicalUrl(a.url) === canonicalUrl(b.url)
}

export function containingPartitions(state: AppState, bookmark: Bookmark) {
  return state.partitions.filter((p) => allBookmarks(p).some((b) => sameBookmark(b, bookmark)))
}

export function syncBookmark(state: AppState, original: Bookmark, updated: Bookmark) {
  for (const p of state.partitions) {
    for (const b of allBookmarks(p)) {
      if (sameBookmark(b, original)) Object.assign(b, updated, { id: b.id })
    }
  }
}

export function removeBookmarkCopies(p: Partition, bookmark: Bookmark) {
  const ids = new Set(allBookmarks(p).filter((b) => sameBookmark(b, bookmark)).map((b) => b.id))
  p.items = p.items.filter((it) => it.kind !== 'bookmark' || !ids.has(it.bookmark.id))
  for (const it of p.items) {
    if (it.kind === 'group') it.group.bookmarks = it.group.bookmarks.filter((b) => !ids.has(b.id))
  }
  p.dock = p.dock.filter((id) => !ids.has(id))
}

export function copyBookmark(state: AppState, bookmark: Bookmark, sourceId: string, targetIds: string[]) {
  for (const p of state.partitions) {
    if (p.id === sourceId || !targetIds.includes(p.id)) continue
    if (allBookmarks(p).some((b) => sameBookmark(b, bookmark))) continue
    p.items.push({ id: uid(), kind: 'bookmark', bookmark: { ...bookmark } })
  }
}
