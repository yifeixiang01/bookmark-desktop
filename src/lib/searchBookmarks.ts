import type { Partition } from '@/types/bookmark'
import { allBookmarks } from './store'

export function searchBookmarks(partitions: Partition[], query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return partitions.flatMap((space) => allBookmarks(space).filter((bookmark) => {
    const text = `${bookmark.name} ${bookmark.url} ${bookmark.description ?? ''}`.toLocaleLowerCase()
    return words.every((word) => text.includes(word))
  }).map((bookmark) => ({ spaceId: space.id, spaceName: space.name, bookmark })))
}
