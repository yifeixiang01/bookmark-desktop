import { BookmarkContextMenu } from './BookmarkContextMenu'
import { useEffect, useRef, useState } from 'react'
import { FolderOutput, Pin, Plus } from 'lucide-react'
import type { Bookmark, Group } from '@/types/bookmark'
import { FaviconImg } from './FaviconImg'
import { dragState } from '@/lib/dragState'
import { TipBubble, useHoverTip } from './HoverTip'

interface Props {
  group: Group | null
  /** 被点击的文件夹图标在视口中的位置，用于原位展开 */
  anchor: DOMRect | null
  editMode: boolean
  dockIds: string[]
  onClose: () => void
  onRename: (groupId: string) => void
  onAddBookmark: (groupId: string) => void
  onCopyBookmark: (bookmarkId: string) => void
  onEditBookmark: (groupId: string, bookmarkId: string) => void
  onDeleteBookmark: (bookmarkId: string) => void
  onToggleDock: (bookmarkId: string) => void
  onMoveToDesktop: (bookmarkId: string) => void
  /** 拖拽中的面板书签 id（半透明源位） */
  dragBookmarkId?: string | null
  /** 有桌面书签悬停在面板上（松手即放入文件夹） */
  dropHighlight?: boolean
  panelRef?: React.Ref<HTMLDivElement>
  onPressBookmark?: (e: React.PointerEvent, bookmarkId: string) => void
}

const PANEL_W = 352
const COLS = 4
const CELL_H = 84
const HEADER_H = 44
const PAD = 16
/** 每页行数：内容超过 4x3 一页时横向翻页 */
const PAGE_ROWS = 3

/** 面板内的单个书签格：支持悬停提示、拖出到桌面、编辑角标 */
function PanelBookmarkCell({
  bookmark: b, editMode, pinned, dragging, onPress,
  onToggleDock, onMoveToDesktop, onEdit, onDelete, onCopy,
}: {
  bookmark: Bookmark
  editMode: boolean
  pinned: boolean
  dragging: boolean
  onPress?: (e: React.PointerEvent, bookmarkId: string) => void
  onToggleDock: () => void
  onMoveToDesktop: () => void
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const tip = useHoverTip()
  return (
    <BookmarkContextMenu onEdit={onEdit} onDelete={onDelete} onCopy={onCopy}>
    <div
      className={`relative flex flex-col items-center gap-1.5 ${dragging ? 'opacity-25' : ''}`}
      onPointerDown={(e) => {
        tip.bind.onPointerDown()
        onPress?.(e, b.id)
      }}
      onMouseEnter={tip.bind.onMouseEnter}
      onMouseLeave={tip.bind.onMouseLeave}
      onClickCapture={(e) => {
        if (dragState.suppressClick) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      style={onPress ? { touchAction: 'none' } : undefined}
    >
      {!editMode && tip.show && (
        <TipBubble name={b.name} description={b.description} url={b.url} rect={tip.rect} />
      )}
      <a
        href={b.url}
        target="_blank"
        rel="noreferrer"
        draggable={false}
        className="spring-hover -m-1 block rounded-2xl p-1 hover:scale-110 hover:bg-black/5 active:scale-95"
      >
        <FaviconImg url={b.url} name={b.name} customIcon={b.icon} size={48} />
      </a>
      <span className="w-full truncate text-center text-xs text-slate-600">
        {b.name}
      </span>
      {editMode && (
        <div className="absolute -top-1.5 -right-0.5 flex gap-0.5">
          <button
            title={pinned ? '从 Dock 移除' : '固定到 Dock'}
            onClick={onToggleDock}
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-full p-[3px] shadow ${
              pinned ? 'bg-amber-400 text-white' : 'bg-white text-slate-400 hover:text-slate-600'
            }`}
          >
            <Pin size={10} />
          </button>
          <button
            title="移出到桌面"
            onClick={onMoveToDesktop}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white p-[3px] text-slate-500 shadow hover:text-slate-700"
          >
            <FolderOutput size={10} />
          </button>
          <button
            title="编辑"
            onClick={onEdit}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[10px] text-slate-600 shadow hover:bg-slate-100"
          >
            ✎
          </button>
          <button
            title="删除"
            onClick={onDelete}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow hover:bg-red-400"
          >
            ×
          </button>
        </div>
      )}
    </div>
    </BookmarkContextMenu>
  )
}

type Cell = { kind: 'bm'; b: Bookmark } | { kind: 'add' }

/**
 * 文件夹展开面板（华为式原位弹开）：
 * 从被点击的文件夹图标位置展开，贴近图标上方或下方；
 * 内容超过一页（4x3）时横向滑动翻页，底部显示页面指示点。
 * 关闭方式：Esc、× 按钮、点击桌面空白处（由 Home 的 clickCapture 处理）。
 */
export function FolderPanel({
  group, anchor, editMode, dockIds, dragBookmarkId, dropHighlight, panelRef, onPressBookmark,
  onClose, onRename, onAddBookmark, onCopyBookmark, onEditBookmark, onDeleteBookmark, onToggleDock, onMoveToDesktop,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    if (!group) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [group, onClose])

  // 切换文件夹时回到第一页
  useEffect(() => {
    setActivePage(0)
    scrollRef.current?.scrollTo({ left: 0 })
  }, [group?.id])

  // 桌面端：纵向滚轮转横向翻页
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY + e.deltaX
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  if (!group || !anchor) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(PANEL_W, vw - 16)

  // 横向分页：每页 COLS x PAGE_ROWS 格（含末尾的「添加」格），内容少时面板保持紧凑
  const rows = Math.min(PAGE_ROWS, Math.max(1, Math.ceil((group.bookmarks.length + 1) / COLS)))
  const perPage = rows * COLS
  const cells: Cell[] = [...group.bookmarks.map((b) => ({ kind: 'bm' as const, b })), { kind: 'add' }]
  const pages: Cell[][] = []
  for (let i = 0; i < cells.length; i += perPage) pages.push(cells.slice(i, i + perPage))
  const pageCount = pages.length

  const h =
    PAD * 2 + HEADER_H + rows * CELL_H + (pageCount > 1 ? 24 : 0) + (group.bookmarks.length === 0 ? 24 : 0)

  let left = anchor.left + anchor.width / 2 - w / 2
  left = Math.max(8, Math.min(left, vw - w - 8))
  let below = true
  let top = anchor.bottom + 12
  if (top + h > vh - 8) {
    top = anchor.top - h - 12
    below = false
  }
  if (top < 8) {
    top = 8
    below = true
  }
  const originX = Math.max(0, Math.min(100, ((anchor.left + anchor.width / 2 - left) / w) * 100))
  const origin = `${originX}% ${below ? '0%' : '100%'}`

  // 注意：不用全屏遮罩拦截点击 —— 否则面板打开时桌面图标无法按下拖拽（华为手机桌面也是如此）。
  return (
    <>
      <div
        ref={panelRef}
        className={`folder-pop fixed z-50 rounded-3xl border bg-white/85 shadow-2xl shadow-black/25 backdrop-blur-xl transition-[box-shadow,border-color] ${
          dropHighlight ? 'border-sky-400 ring-4 ring-sky-300/50' : 'border-white/40'
        }`}
        style={{ left, top, width: w, transformOrigin: origin }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{group.name}</span>
            <span className="text-xs text-slate-400">{group.bookmarks.length}</span>
            {editMode && (
              <button
                title="重命名"
                onClick={() => onRename(group.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500 hover:bg-slate-200"
              >
                ✎
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1">
            ×
          </button>
        </div>

        {/* 横向翻页区：scroll-snap 逐页吸附，隐藏滚动条 */}
        <div
          ref={scrollRef}
          onScroll={(e) =>
            setActivePage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
          }
          className="flex snap-x snap-mandatory overflow-x-auto pt-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {pages.map((pageCells, pi) => (
            <div
              key={pi}
              className="grid w-full shrink-0 snap-start content-start grid-cols-4 gap-x-2 gap-y-4 px-4"
              style={{ gridAutoRows: CELL_H }}
            >
              {pageCells.map((cell) =>
                cell.kind === 'bm' ? (
                  <PanelBookmarkCell
                    key={cell.b.id}
                    bookmark={cell.b}
                    editMode={editMode}
                    pinned={dockIds.includes(cell.b.id)}
                    dragging={dragBookmarkId === cell.b.id}
                    onPress={onPressBookmark}
                    onToggleDock={() => onToggleDock(cell.b.id)}
                    onMoveToDesktop={() => onMoveToDesktop(cell.b.id)}
                    onCopy={() => onCopyBookmark(cell.b.id)}
                    onEdit={() => onEditBookmark(group.id, cell.b.id)}
                    onDelete={() => onDeleteBookmark(cell.b.id)}
                  />
                ) : (
                  <button
                    key="add"
                    onClick={() => onAddBookmark(group.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="spring-hover flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500 hover:scale-105">
                      <Plus size={18} />
                    </span>
                    <span className="text-xs text-slate-400">添加</span>
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        {/* 页面指示点（多页时）：点击直达对应页 */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2.5">
            {pages.map((_, pi) => (
              <button
                key={pi}
                aria-label={`第 ${pi + 1} 页`}
                onClick={() => {
                  const el = scrollRef.current
                  if (el) el.scrollTo({ left: pi * el.clientWidth, behavior: 'smooth' })
                }}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  pi === activePage ? 'w-4 bg-slate-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}

        <div className="pb-3" />

        {group.bookmarks.length === 0 && (
          <p className="pb-4 text-center text-sm text-slate-400">空文件夹 —— 点「添加」放入第一个网站</p>
        )}
      </div>
    </>
  )
}
