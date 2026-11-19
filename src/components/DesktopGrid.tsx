import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { DesktopItem, GridPos } from '@/types/bookmark'
import { dragVisualOf, findFreeRect, layoutItems, previewInsert, spanOf } from '@/lib/gridLayout'
import { dragState } from '@/lib/dragState'
import type { DragInfo, DragSource, GridFrame } from '@/hooks/useDesktopDrag'
import { BookmarkTile } from './BookmarkTile'
import { FolderTile } from './FolderTile'
import { AppTile } from '@/apps/AppTile'
import type { AppAction } from '@/apps'

interface Props {
  items: DesktopItem[]
  editMode: boolean
  locked: boolean
  iconPx: number
  selected: ReadonlySet<string>
  /** 当前拖拽状态（幽灵在 Home 渲染；这里画源位变暗 / 合并高亮 / 目标格指示） */
  drag: DragInfo | null
  /** 网格几何信息回写，供拖拽管理器命中检测 */
  gridRef: React.RefObject<GridFrame | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  onPress: (e: React.PointerEvent, source: DragSource) => void
  onToggleSelect: (bookmarkId: string) => void
  onToggleSelectGroup?: (groupId: string) => void
  onMoveBookmark: (bookmarkId: string) => void
  onCopyBookmark: (bookmarkId: string) => void
  onEditBookmark: (bookmarkId: string) => void
  onDeleteBookmark: (item: Extract<DesktopItem, { kind: 'bookmark' }>) => void
  onOpenGroup: (groupId: string, anchor: DOMRect) => void
  onRenameGroup: (groupId: string) => void
  onDeleteGroup: (group: Extract<DesktopItem, { kind: 'group' }>['group']) => void
  onDeleteApp?: (id: string) => void
  onAppAction?: (id: string, action: AppAction) => void
  noteHistory?: import('@/types/bookmark').NoteArchive[]
  onMoveGroup?: (groupId: string) => void
  onDissolveGroup?: (groupId: string) => void
  editingGroup?: { id: string; value: string } | null
  onGroupNameChange?: (value: string) => void
  onConfirmGroupName?: () => void
  onCancelGroupName?: () => void
  onAddClick: () => void
}

/** 测量外层可用区域（高 → 定行数；宽 → 定每页列数） */
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
 * 行数和每页列数由视口决定，内容超出后按整页横向翻动；
 * 书签占 1x1 格、文件夹占 2x2 格；位置变化带滑动过渡。
 * 滚动容器内部预留悬停动效空间，避免首行放大后的图标被裁剪。
 */
export function DesktopGrid(props: Props) {
  const { editMode, locked, iconPx, selected, drag, gridRef, scrollRef } = props
  const ponds = props.items.filter((item) => item.kind === 'app' && item.app.type === 'fishpond')
  const items = props.items.filter((item) => !(item.kind === 'app' && item.app.type === 'fishpond'))
  const { ref, w, h } = useContainerSize()
  const gridElRef = useRef<HTMLDivElement>(null)
  const [pageIndex, setActivePage] = useState(0)
  const previousPondCount = useRef(ponds.length)

  const colW = iconPx + 40
  const EDGE_PAD = 8
  const rowH = iconPx + 56
  const availW = (w || 960) - EDGE_PAD * 2
  const DOTS_H = 26
  const HOVER_TOP_PAD = 20
  const HOVER_BOTTOM_PAD = 8
  const availH = (h || 560) - EDGE_PAD * 2 - DOTS_H - HOVER_TOP_PAD - HOVER_BOTTOM_PAD
  const fitRows = Math.max(3, Math.floor(availH / rowH))
  // 垂直方向至少 6 行；按实际可用高度逐行扩展，释放 Dock 后的空间可直接增加一行。
  const rows = Math.max(6, fitRows)
  const scale = Math.min(1, availH / (rows * rowH))
  const visibleCols = Math.max(2, Math.floor(availW / (colW * scale)))
  const { placements, cols: usedCols } = layoutItems(items, rows, visibleCols)
  const requiredCols = Math.max(usedCols + (editMode ? 1 : 0), visibleCols)
  const bookmarkPages = items.length || editMode || !ponds.length ? Math.max(1, Math.ceil(requiredCols / visibleCols)) : 0
  const pageCount = bookmarkPages + ponds.length
  const activePage = Math.min(pageIndex, pageCount - 1)
  const cols = bookmarkPages * visibleCols
  const pageWidth = visibleCols * colW * scale
  const pageHeight = rows * rowH * scale

  useEffect(() => {
    const added = ponds.length > previousPondCount.current
    previousPondCount.current = ponds.length
    if (!added) return
    const frame = requestAnimationFrame(() => setActivePage(pageCount - 1))
    return () => cancelAnimationFrame(frame)
  }, [ponds.length, pageCount])

  useLayoutEffect(() => {
    const page = Math.min(activePage, pageCount - 1)
    if (scrollRef.current) scrollRef.current.scrollLeft = page * pageWidth
  }, [activePage, pageCount, pageWidth, scrollRef])

  const goToPage = (page: number) => {
    const next = Math.max(0, Math.min(page, pageCount - 1))
    scrollRef.current?.scrollTo({ left: next * pageWidth, behavior: 'smooth' })
    setActivePage(next)
  }

  // 回写几何信息给拖拽管理器（el 用内层网格：mx-auto 居中，rect 随滚动实时测量）
  useLayoutEffect(() => {
    if (gridElRef.current) {
      gridRef.current = {
        el: gridElRef.current,
        offsetX: 0,
        cols,
        pageCols: visibleCols,
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
      previewMoves = previewInsert(items, placements, dragSourceItemId, dragSpan, drag.overCell, rows, visibleCols)
      if (previewMoves.size === 0) previewMoves = null
    }
  }

  const addCell: GridPos = findFreeRect(items, placements, rows, { w: 1, h: 1 }, '', 0, visibleCols)

  const cellStyle = (cell: GridPos, span: { w: number; h: number }): React.CSSProperties => ({
    left: cell.x * colW,
    top: cell.y * rowH,
    width: span.w * colW,
    height: span.h * rowH,
  })

  return (
    <div ref={ref} className="flex h-full min-w-full flex-col items-center px-2 pt-2">
      <div
        ref={scrollRef}
        className="no-scrollbar box-content shrink-0 max-w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        style={{ width: pageWidth, height: pageHeight, paddingTop: HOVER_TOP_PAD, paddingBottom: HOVER_BOTTOM_PAD }}
        onScroll={(event) => setActivePage(Math.round(event.currentTarget.scrollLeft / pageWidth))}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
          event.preventDefault()
          const current = Math.round(event.currentTarget.scrollLeft / pageWidth)
          goToPage(current + (event.deltaY > 0 ? 1 : -1))
        }}
      >
      <div className="relative" style={{ width: pageCount * pageWidth, height: pageHeight }}>
        <div className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: pageCount }).map((_, page) => (
            <div key={page} className="h-full shrink-0 snap-start" style={{ width: pageWidth }} />
          ))}
        </div>
        <div
          ref={gridElRef}
          className="relative z-10"
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
              data-wallpaper-exclude
              data-wallpaper-anchor={item.kind === 'app' ? undefined : item.id}
              data-wallpaper-dragging={isSource || undefined}
              onPointerDown={locked || item.kind === 'app' ? undefined : (e) => props.onPress(e, { kind: 'desktop-item', itemId: item.id })}
              className={`absolute flex items-start justify-center ${
                !noSlide && drag ? 'transition-[left,top] duration-200 ease-out' : ''
              } ${locked || item.kind === 'app' ? '' : 'cursor-grab'} ${editMode ? 'jiggle' : ''} ${isSource ? 'opacity-25' : ''} ${
                isMergeTarget ? 'z-10 scale-110 drop-shadow-[0_0_14px_rgba(255,255,255,0.55)]' : ''
              }`}
              style={{ ...cellStyle(cell, span), touchAction: locked || item.kind === 'app' ? undefined : 'none' }}
            >
              {item.kind === 'bookmark' ? (
                <BookmarkTile
                  bookmark={item.bookmark}
                  editMode={editMode}
                  selected={selected.has(item.bookmark.id)}
                  iconPx={iconPx}
                  enterDelay={Math.min(index * 28, 380)}
                  onToggleSelect={() => props.onToggleSelect(item.bookmark.id)}
                  onMove={() => props.onMoveBookmark(item.bookmark.id)}
                  onCopy={() => props.onCopyBookmark(item.bookmark.id)}
                  onEdit={() => props.onEditBookmark(item.bookmark.id)}
                  onDelete={() => props.onDeleteBookmark(item)}
                />
              ) : item.kind === 'group' ? (
                <FolderTile
                  group={item.group}
                  editMode={editMode}
                  iconPx={iconPx}
                  enterDelay={Math.min(index * 28, 380)}
                  onOpen={(rect) => props.onOpenGroup(item.group.id, rect)}
                  onRename={() => props.onRenameGroup(item.group.id)}
                  nameEditor={props.editingGroup?.id === item.group.id ? {
                    value: props.editingGroup.value,
                    onChange: (value) => props.onGroupNameChange?.(value),
                    onConfirm: () => props.onConfirmGroupName?.(),
                    onCancel: () => props.onCancelGroupName?.(),
                  } : undefined}
                  onDelete={() => props.onDeleteGroup(item.group)}
                  onMove={() => props.onMoveGroup?.(item.group.id)}
                  onDissolve={() => props.onDissolveGroup?.(item.group.id)}
                  selected={selected.has(item.group.id)}
                  onToggleSelect={() => props.onToggleSelectGroup?.(item.group.id)}
                />
              ) : <AppTile app={item.app} noteHistory={props.noteHistory} width={dragVisualOf(item, iconPx).w} height={dragVisualOf(item, iconPx).h} editMode={editMode} locked={locked} onPress={(e) => props.onPress(e, { kind: 'desktop-item', itemId: item.id })} onAction={(action) => props.onAppAction?.(item.id, action)} onRemove={() => props.onDeleteApp?.(item.id)} />}
            </div>
          )
        })}

        {/* 编辑模式下保留新建文件夹入口 */}
        {editMode && <div
          className="absolute flex items-start justify-center transition-[left,top] duration-200 ease-out"
          style={cellStyle(addCell, { w: 1, h: 1 })}
        >
          <div className="flex w-20 flex-col items-center gap-1.5 pt-0.5">
            <button
              onClick={props.onAddClick}
              title="新建文件夹"
              className="grid place-items-center rounded-2xl border-2 border-dashed border-white/40 text-white/70 backdrop-blur-sm transition-colors hover:border-white/70 hover:text-white"
              style={{ width: iconPx, height: iconPx }}
            >
              <Plus size={Math.round(iconPx * 0.4)} />
            </button>
            <span className="text-xs text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              新建文件夹
            </span>
          </div>
        </div>}
        </div>
        {ponds.map((item, index) => item.kind === 'app' && <div key={item.id} className="absolute top-0 z-10" style={{ left: (bookmarkPages + index) * pageWidth }}>
          <AppTile app={item.app} width={pageWidth - 8} height={pageHeight - 8} editMode={editMode} onAction={(action) => props.onAppAction?.(item.id, action)} onRemove={() => props.onDeleteApp?.(item.id)} />
        </div>)}
      </div>
      </div>
      {pageCount > 1 && (
        <div className="flex h-[26px] shrink-0 items-center justify-center gap-2" aria-label={`第 ${activePage + 1} 页，共 ${pageCount} 页`}>
          {Array.from({ length: pageCount }).map((_, page) => (
            <button
              key={page}
              type="button"
              aria-label={`转到第 ${page + 1} 页`}
              aria-current={page === activePage ? 'page' : undefined}
              onClick={() => goToPage(page)}
              className={`h-2 rounded-full transition-all ${page === activePage ? 'w-5 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
