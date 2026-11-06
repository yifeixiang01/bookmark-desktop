import { useRef } from 'react'
import type { Group } from '@/types/bookmark'
import { dragState } from '@/lib/dragState'
import { folderCellIconPx, folderTilePx } from '@/lib/gridLayout'
import { FaviconImg } from './FaviconImg'
import { TipBubble, useHoverTip } from './HoverTip'

interface Props {
  group: Group
  editMode: boolean
  iconPx: number
  enterDelay: number
  /** 打开文件夹面板，携带图标位置用于原位展开动画 */
  onOpen: (anchor: DOMRect) => void
  onRename: () => void
  onDelete: () => void
}

/**
 * 文件夹图标（华为桌面式，图标可直接点击）：
 * 占 2x2 格（宽度=两个图标位），3x3 宫格；超过 8 个时第 9 格为堆叠预览，不足补虚线占位。
 */
export function FolderTile({ group, editMode, iconPx, enterDelay, onOpen, onRename, onDelete }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tip = useHoverTip()

  const openWithAnchor = () => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) onOpen(rect)
  }

  const suppressClick = (e: React.SyntheticEvent) => {
    if (dragState.suppressClick) {
      e.preventDefault()
      e.stopPropagation()
      dragState.suppressClick = false
    }
  }

  // 文件夹内图标略小于桌面独立图标；瓷砖边长与布局引擎共用同一公式
  const cellIcon = folderCellIconPx(iconPx)
  const tileSize = folderTilePx(iconPx)

  const capacity = 9
  const overflow = group.bookmarks.length > capacity - 1
  const directCount = overflow ? capacity - 1 : group.bookmarks.length

  /** 可点击的网站图标格 */
  const iconCell = (b: Group['bookmarks'][number]) =>
    editMode ? (
      <button key={b.id} onClick={openWithAnchor} className="spring-hover active:scale-95">
        <FaviconImg url={b.url} name={b.name} customIcon={b.icon} size={cellIcon} />
      </button>
    ) : (
      <a draggable={false}
        key={b.id}
        href={b.url}
        target="_blank"
        rel="noreferrer"
        title={b.name}
        className="spring-hover block hover:scale-110 active:scale-95"
      >
        <FaviconImg url={b.url} name={b.name} customIcon={b.icon} size={cellIcon} />
      </a>
    )

  const tile = (
    <div className="grid grid-cols-3 place-items-center gap-2 rounded-[26px] border border-white/25 bg-white/20 p-2.5 shadow-lg shadow-black/15 backdrop-blur-md">
      {group.bookmarks.slice(0, directCount).map(iconCell)}
      {overflow && (
        <button
          onClick={openWithAnchor}
          className="spring-hover grid grid-cols-2 place-items-center gap-1 rounded-xl bg-white/25 p-1.5 backdrop-blur-sm hover:scale-105 active:scale-95"
          style={{ width: cellIcon, height: cellIcon }}
          title={`查看全部 ${group.bookmarks.length} 个`}
        >
          {group.bookmarks.slice(directCount, directCount + 4).map((b) => (
            <FaviconImg key={b.id} url={b.url} name={b.name} customIcon={b.icon} size={Math.round(cellIcon * 0.36)} className="rounded-md" />
          ))}
        </button>
      )}
      {Array.from({ length: capacity - directCount - (overflow ? 1 : 0) }).map((_, i) => (
        <button
          key={`pad-${i}`}
          onClick={openWithAnchor}
          className="rounded-xl border border-dashed border-white/25"
          style={{ width: cellIcon, height: cellIcon }}
          title="打开文件夹"
        />
      ))}
    </div>
  )

  return (
    <div
      ref={rootRef}
      className="tile-enter relative flex flex-col items-center gap-1.5"
      style={{ width: tileSize, animationDelay: `${enterDelay}ms` }}
      onClickCapture={suppressClick}
      {...tip.bind}
    >
      {!editMode && tip.show && (
        <TipBubble
          name={group.name}
          description={`${group.bookmarks.length} 个网站`}
          url=""
          rect={tip.rect}
        />
      )}
      {tile}
      <span
        className="max-w-full cursor-pointer truncate text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        title={group.name}
        onClick={openWithAnchor}
      >
        {group.name}
      </span>

      {editMode && (
        <>
          <button
            title="删除文件夹"
            onClick={onDelete}
            className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/90 text-[11px] text-white shadow hover:bg-red-500"
          >
            ×
          </button>
          <button
            title="重命名"
            onClick={onRename}
            className="absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-slate-600 shadow hover:bg-white"
          >
            ✎
          </button>
        </>
      )}
    </div>
  )
}
