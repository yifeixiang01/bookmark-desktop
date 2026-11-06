import { useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { DesktopItem, GridPos } from '@/types/bookmark'
import { dragVisualOf, findFreeRect, layoutItems, previewInsert, spanOf } from '@/lib/gridLayout'
import { dragState } from '@/lib/dragState'
import type { DragInfo, DragSource, GridFrame } from '@/hooks/useDesktopDrag'
import { BookmarkTile } from './BookmarkTile'
import { FolderTile } from './FolderTile'

interface Props {
  items: DesktopItem[]
  editMode: boolean
  locked: boolean
  iconPx: number
  dockIds: string[]
  selected: ReadonlySet<string>
  /** 当前拖拽状态（幽灵在 Home 渲染；这里画源位变暗 / 合并高亮 / 目标格指示） */
  drag: DragInfo | null
  /** 网格几何信息回写，供拖拽管理器命中检测 */
  gridRef: React.RefObject<GridFrame | null>
  onPress: (e: React.PointerEvent, source: DragSource) => void
  onToggleSelect: (bookmarkId: string) => void
  onEditBookmark: (bookmarkId: string) => void
  onDeleteBookmark: (item: Extract<DesktopItem, { kind: 'bookmark' }>) => void
  onToggleDock: (bookmarkId: string) => void
  onOpenGroup: (groupId: string, anchor: DOMRect) => void
  onRenameGroup: (groupId: string) => void
  onDeleteGroup: (group: Extract<DesktopItem, { kind: 'group' }>['group']) => void
  onAddClick: () => void
}

/** 测量外层可用区域（高 → 定行数；宽 → 定最少列数） */
function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setSize({ w: entries[0].contentRect.width, h: entries[0].contentRect.height })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

/**
 * 桌面网格（手机桌面式自由摆放 + 横向翻页）：
 * 行数由可视高度固定，列数随内容向右延伸（超出后由外层容器横向滚动）；
 * 书签占 1x1 格、文件夹占 2x2 格；位置变化带滑动过渡。
 * 外层留 8px 内边距：编辑模式的删除/重命名角标凸出图标边缘，避免被滚动容器裁剪。
 */
export function DesktopGrid(props: Props) {
  const { items, editMode, locked, iconPx, dockIds, selected, drag } = props
  const { ref, w, h } = useContainerSize()
  const gridElRef = useRef<HTMLDivElement>(null)

  const colW = iconPx + 40
  const EDGE_PAD = 8
  const rowH = iconPx + 56
  const availW = (w || 960) - EDGE_PAD * 2
  const availH = (h || 560) - EDGE_PAD * 2
  const fitRows = Math.max(3, Math.floor(availH / rowH))
  // 垂直方向至少 6 行（6 个图标位）：一个文件夹占 2 行，保证一屏纵向能放 3 个文件夹；
  // 更高的屏幕向下取 2 的整数倍；空间不足 6 行时整个网格等比缩小（scale），而不是压缩行距
  const rows = Math.max(6, Math.floor(fitRows / 2) * 2)
  const scale = Math.min(1, availH / (rows * rowH))
  const { placements, cols: usedCols } = layoutItems(items, rows)
  // 至少铺满一屏；尾部始终多留一列空位，便于拖放与新增
  const minCols = Math.max(4, Math.floor(availW / (colW * scale)))
  const cols = Math.max(usedCols + 1, minCols)

  // 回写几何信息给拖拽管理器（el 用内层网格：mx-auto 居中，rect 随滚动实时测量）
  useLayoutEffect(() => {
    if (gridElRef.current) {
      props.gridRef.current = {
        el: gridElRef.current,
        offsetX: 0,
        cols,
        rows,
        colW,
        rowH,
        iconPx,
        /** 网格整体缩放比例（<1 时命中检测/落点需换算） */
        scale,
        items,
        placements,
      }
    }
  })

  // 落点吸附提交后的那次渲染里，被落位项目禁止 left/top 过渡；读完即清
  useLayoutEffect(() => {
    dragState.lastPlacedItemId = null
  })

  const dragSourceItemId = drag?.source.kind === 'desktop-item' ? drag.source.itemId : null
  const dragSourceItem = (() => {
    if (!drag || drag.source.kind !== 'desktop-item') return null
    return items.find((i) => i.id === (drag.source as Extract<DragSource, { kind: 'desktop-item' }>).itemId) ?? null
  })()
  const dragSpan = dragSourceItem ? spanOf(dragSourceItem) : { w: 1, h: 1 }

  /** 目标格指示框的可视尺寸：与拖拽物图标等大（而不是整个网格槽位） */
  const dragVisual = dragVisualOf(dragSourceItem, iconPx)

  // 拖拽悬停"排开"预览：拖到两格之间/压到其他项目上时，被压项目实时顺推让位。
  // 合并悬停（mergeTarget）或悬停在文件夹面板上时不排开；松手后由 placeItemAt 以同样规则提交
  let previewMoves: Map<string, GridPos> | null = null
  if (drag && drag.overCell && !drag.overPanel && !drag.mergeTargetItemId && dragSourceItemId && dragSourceItem) {
    const srcCell = placements.get(dragSourceItemId)
    const same = srcCell && srcCell.x === drag.overCell.x && srcCell.y === drag.overCell.y
    if (!same) {
      previewMoves = previewInsert(items, placements, dragSourceItemId, dragSpan, drag.overCell, rows)
      if (previewMoves.size === 0) previewMoves = null
    }
  }

  const addCell: GridPos = findFreeRect(items, placements, rows, { w: 1, h: 1 })

  const cellStyle = (cell: GridPos, span: { w: number; h: number }): React.CSSProperties => ({
    left: cell.x * colW,
    top: cell.y * rowH,
    width: span.w * colW,
    height: span.h * rowH,
  })

  return (
    <div ref={ref} className="h-full min-w-full p-2">
      {/* 外层尺寸 = 缩放后的可视尺寸；内层网格以自然尺寸渲染再整体缩放 */}
      <div
        className="mx-auto"
        style={{ width: Math.ceil(cols * colW * scale), height: Math.ceil(rows * rowH * scale) }}
      >
        <div
          ref={gridElRef}
          className="relative"
          style={{
            width: cols * colW,
            height: rows * rowH,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
        {/* 目标格指示（拖拽经过空位时）：与拖拽物图标等大；文件夹在其格区内顶部对齐（与实际渲染一致） */}
        {drag && drag.overCell && !drag.overPanel && (
          <div
            className="pointer-events-none absolute transition-[left,top] duration-100"
            style={{
              left: drag.overCell.x * colW + (dragSpan.w * colW - dragVisual.w) / 2,
              top: drag.overCell.y * rowH + 2,
              width: dragVisual.w,
              height: dragVisual.h,
            }}
          >
            <div
              className="h-full w-full border-2 border-dashed border-white/55 bg-white/10"
              style={{ borderRadius: `${Math.round(dragVisual.ratio * 100)}%` }}
            />
          </div>
        )}

        {items.map((item, index) => {
          // 拖拽预览中被挤动的项目渲染在顺推后的位置（带滑动过渡）
          const cell = (item.id !== dragSourceItemId ? previewMoves?.get(item.id) : undefined) ?? placements.get(item.id) ?? { x: 0, y: 0 }
          const span = spanOf(item)
          const isSource = dragSourceItemId === item.id
          const isMergeTarget = drag?.mergeTargetItemId === item.id
          // 落点吸附动画结束、数据提交的这一帧：该项目直接出现在新格，不从旧位置滑动
          const noSlide = dragState.lastPlacedItemId === item.id
          return (
            <div
              key={item.id}
              onPointerDown={locked ? undefined : (e) => props.onPress(e, { kind: 'desktop-item', itemId: item.id })}
              className={`absolute flex items-start justify-center ${
                noSlide ? '' : 'transition-[left,top] duration-200 ease-out'
              } ${locked ? '' : 'cursor-grab'} ${editMode ? 'jiggle' : ''} ${isSource ? 'opacity-25' : ''} ${
                isMergeTarget ? 'z-10 scale-110 drop-shadow-[0_0_14px_rgba(255,255,255,0.55)]' : ''
              }`}
              style={{ ...cellStyle(cell, span), touchAction: locked ? undefined : 'none' }}
            >
              {item.kind === 'bookmark' ? (
                <BookmarkTile
                  bookmark={item.bookmark}
                  editMode={editMode}
                  pinned={dockIds.includes(item.bookmark.id)}
                  selected={selected.has(item.bookmark.id)}
                  iconPx={iconPx}
                  enterDelay={Math.min(index * 28, 380)}
                  onToggleSelect={() => props.onToggleSelect(item.bookmark.id)}
                  onEdit={() => props.onEditBookmark(item.bookmark.id)}
                  onDelete={() => props.onDeleteBookmark(item)}
                  onToggleDock={() => props.onToggleDock(item.bookmark.id)}
                />
              ) : (
                <FolderTile
                  group={item.group}
                  editMode={editMode}
                  iconPx={iconPx}
                  enterDelay={Math.min(index * 28, 380)}
                  onOpen={(rect) => props.onOpenGroup(item.group.id, rect)}
                  onRename={() => props.onRenameGroup(item.group.id)}
                  onDelete={() => props.onDeleteGroup(item.group)}
                />
              )}
            </div>
          )
        })}

        {/* 添加入口：固定跟在最后一个空位 */}
        <div
          className="absolute flex items-start justify-center transition-[left,top] duration-200 ease-out"
          style={cellStyle(addCell, { w: 1, h: 1 })}
        >
          <div className="flex w-20 flex-col items-center gap-1.5 pt-0.5">
            <button
              onClick={props.onAddClick}
              title={editMode ? '新建文件夹' : '添加书签'}
              className="grid place-items-center rounded-2xl border-2 border-dashed border-white/40 text-white/70 backdrop-blur-sm transition-colors hover:border-white/70 hover:text-white"
              style={{ width: iconPx, height: iconPx }}
            >
              <Plus size={Math.round(iconPx * 0.4)} />
            </button>
            <span className="text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {editMode ? '新建文件夹' : '添加书签'}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
