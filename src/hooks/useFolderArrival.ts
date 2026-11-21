import { useLayoutEffect, useRef } from 'react'
import type { Group } from '@/types/bookmark'

/** Acknowledge a new bookmark without replaying the folder's entrance animation. */
export function useFolderArrival(group: Group | null, rootRef: React.RefObject<HTMLElement | null>) {
  const previous = useRef<Group | null>(null)

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = group
    const root = rootRef.current
    if (!root || !group || before?.id !== group.id || group.bookmarks.length <= before.bookmarks.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const oldIds = new Set(before.bookmarks.map((bookmark) => bookmark.id))
    const incoming = new Set(group.bookmarks.filter((bookmark) => !oldIds.has(bookmark.id)).map((bookmark) => bookmark.id))
    if (!incoming.size) return

    for (const cell of root.querySelectorAll<HTMLElement>('[data-folder-bookmark]')) {
      if (!incoming.has(cell.dataset.folderBookmark!)) continue
      cell.animate(
        [{ opacity: 0.2, scale: 0.88 }, { opacity: 1, scale: 1 }],
        { duration: 240, easing: 'cubic-bezier(.2,.75,.25,1)' },
      )
    }
    root.querySelector('[data-folder-arrival-glow]')?.animate(
      [{ opacity: 0.65 }, { opacity: 0 }],
      { duration: 420, easing: 'ease-out' },
    )
  }, [group, rootRef])
}
