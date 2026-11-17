import type { DesktopItem, Partition } from '@/types/bookmark'

export function mobileItems(partition: Partition): DesktopItem[] {
  const items = partition.items.filter((item) => item.kind !== 'app')
  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered: DesktopItem[] = []
  const seen = new Set<string>()

  for (const id of partition.mobileOrder ?? []) {
    const item = byId.get(id)
    if (item && !seen.has(id)) {
      ordered.push(item)
      seen.add(id)
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) ordered.push(item)
  }
  return ordered
}

export function moveMobileItem(partition: Partition, itemId: string, delta: -1 | 1) {
  const order = mobileItems(partition).map((item) => item.id)
  const from = order.indexOf(itemId)
  const to = from + delta
  if (from < 0 || to < 0 || to >= order.length) return
  ;[order[from], order[to]] = [order[to], order[from]]
  partition.mobileOrder = order
}
