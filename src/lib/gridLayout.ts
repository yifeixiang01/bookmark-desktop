import type { DesktopItem, GridPos } from '@/types/bookmark'

/**
 * 桌面网格布局引擎（手机桌面式自由摆放、横向翻页）：
 * - 逻辑格：宽 colW px、高 rowH px；书签占 1x1，文件夹占 2x2
 * - 行数固定（由可视高度决定），列数不固定：内容超出一屏时向右延伸、横向滚动
 * - 有 pos 的项目优先占自己的格子（冲突时先到先得），无 pos 的按列优先顺序自动填充空位
 */

export interface Span {
  w: number
  h: number
}

export function spanOf(item: DesktopItem): Span {
  if (item.kind !== 'group') return { w: 1, h: 1 }
  return { w: 2, h: 2 }
}

/** 文件夹瓷砖边长：占 2 个图标槽位的宽度（槽位宽 iconPx+40），左右各留 8px 边距 */
export function folderTilePx(iconPx: number): number {
  return 2 * (iconPx + 40) - 16
}

/** 文件夹瓷砖里 3x3 宫格单个网站图标的边长（p-2.5 + gap-2 + 1px 边框，与 FolderTile 渲染一致） */
export function folderCellIconPx(iconPx: number): number {
  return Math.round((folderTilePx(iconPx) - 38) / 3)
}

/** 拖拽物的可视尺寸（目标格指示框 / 落点吸附动画共用）：与拖拽物图标等大 */
export function dragVisualOf(
  item: DesktopItem | null,
  iconPx: number
): { w: number; h: number; ratio: number } {
  if (!item || item.kind === 'bookmark') return { w: iconPx, h: iconPx, ratio: 0.22 }
  const t = folderTilePx(iconPx)
  return { w: t, h: t, ratio: 0.15 }
}

/** 由可视高度求固定行数（至少 3 行，保证大文件夹放得下） */
export function computeRows(containerHeight: number, rowH: number): number {
  return Math.max(3, Math.floor(containerHeight / rowH))
}

export function rectsOverlap(ax: number, ay: number, as: Span, bx: number, by: number, bs: Span): boolean {
  return ax < bx + bs.w && ax + as.w > bx && ay < by + bs.h && ay + as.h > by
}

/** 在 items 中（排除 excludeId）检测某矩形是否被占用 */
export function rectTaken(
  items: DesktopItem[],
  placements: Map<string, GridPos>,
  excludeId: string,
  x: number,
  y: number,
  span: Span
): boolean {
  for (const it of items) {
    if (it.id === excludeId) continue
    const p = placements.get(it.id)
    if (p && rectsOverlap(x, y, span, p.x, p.y, spanOf(it))) return true
  }
  return false
}

/**
 * 从 fromX 列起，按「列优先」（先列后行）扫描第一个能容纳 span 的空位。
 * 列可无限向右延伸，因此必然能找到；行被 rows 固定。
 */
export function findFreeRect(
  items: DesktopItem[],
  placements: Map<string, GridPos>,
  rows: number,
  span: Span,
  excludeId = '',
  fromX = 0
): GridPos {
  let maxX = fromX
  for (const it of items) {
    if (it.id === excludeId) continue
    const p = placements.get(it.id)
    if (p) maxX = Math.max(maxX, p.x + spanOf(it).w)
  }
  for (let x = fromX; x <= maxX; x++) {
    for (let y = 0; y + span.h <= rows; y++) {
      if (!rectTaken(items, placements, excludeId, x, y, span)) return { x, y }
    }
  }
  // 理论上不可达（maxX 列必为空），兜底放到最右一列
  return { x: maxX + 1, y: 0 }
}

/**
 * 拖拽悬停预览（手机桌面式"排开"）：假设把 source 放到 cell，被压到的项目顺推到下一个空位。
 * 返回被挤动项目的 新位置表（不含 source 自身——拖拽中它由幽灵表示）；数据提交在松手时才发生。
 */
export function previewInsert(
  items: DesktopItem[],
  placements: Map<string, GridPos>,
  sourceId: string,
  span: Span,
  cell: GridPos,
  rows: number
): Map<string, GridPos> {
  const map = new Map(placements)
  const others = items.filter((i) => i.id !== sourceId)
  const displaced = others.filter((o) => {
    const p = map.get(o.id)
    return p && rectsOverlap(cell.x, cell.y, span, p.x, p.y, spanOf(o))
  })
  map.set(sourceId, { ...cell })
  const moved = new Map<string, GridPos>()
  for (const o of displaced) {
    const np = findFreeRect(others, map, rows, spanOf(o), o.id)
    map.set(o.id, np)
    moved.set(o.id, np)
  }
  return moved
}

/**
 * 计算所有项目的格子分配（rows 固定，列向右生长）。
 * 第一遍：有 pos 且矩形空闲的按数组顺序落位；第二遍：其余自动填充。
 * 返回 placements 与实际占用的列数 cols。
 */
export function layoutItems(
  items: DesktopItem[],
  rows: number
): { placements: Map<string, GridPos>; cols: number } {
  const placements = new Map<string, GridPos>()
  const pending: DesktopItem[] = []

  for (const it of items) {
    const span = spanOf(it)
    const p = it.pos
    if (p && p.x >= 0 && p.y >= 0 && p.y + span.h <= rows && !rectTaken(items, placements, it.id, p.x, p.y, span)) {
      placements.set(it.id, { x: p.x, y: p.y })
    } else {
      pending.push(it)
    }
  }
  for (const it of pending) {
    placements.set(it.id, findFreeRect(items, placements, rows, spanOf(it), it.id))
  }

  let cols = 0
  for (const it of items) {
    const p = placements.get(it.id)
    if (p) cols = Math.max(cols, p.x + spanOf(it).w)
  }
  return { placements, cols }
}
