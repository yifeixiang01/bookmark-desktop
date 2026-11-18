import { BookmarkContextMenu } from './BookmarkContextMenu'
import { Check } from 'lucide-react'
import type { Bookmark } from '@/types/bookmark'
import { dragState } from '@/lib/dragState'
import { FaviconImg } from './FaviconImg'
import { TipBubble, useHoverTip } from './HoverTip'

interface Props {
  bookmark: Bookmark
  editMode: boolean
  selected: boolean
  iconPx: number
  enterDelay: number
  onToggleSelect: () => void
  onMove: () => void
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

/** 桌面独立书签图标：直接落在壁纸上，名称在下方（手机桌面式） */
export function BookmarkTile({
  bookmark, editMode, selected, iconPx, enterDelay,
  onToggleSelect, onEdit, onDelete, onCopy, onMove,
}: Props) {
  const tip = useHoverTip()

  const suppressClick = (e: React.SyntheticEvent) => {
    if (dragState.suppressClick) {
      e.preventDefault()
      e.stopPropagation()
      dragState.suppressClick = false
    }
  }

  const icon = (
    <FaviconImg
      url={bookmark.url}
      name={bookmark.name}
      customIcon={bookmark.icon}
      size={iconPx}
      className={selected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent' : ''}
    />
  )

  return (
    <BookmarkContextMenu onMove={onMove} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy}>
    <div
      className="tile-enter relative flex w-20 flex-col items-center gap-1.5"
      style={{ animationDelay: `${enterDelay}ms` }}
      onClickCapture={suppressClick}
      {...tip.bind}
    >
      {!editMode && tip.show && (
        <TipBubble name={bookmark.name} description={bookmark.description} url={bookmark.url} rect={tip.rect} />
      )}
      {editMode ? (
        <button onClick={onToggleSelect} className="spring-hover active:scale-95" title="点击勾选，可批量整理">
          {icon}
        </button>
      ) : (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          draggable={false}
          className="spring-hover -m-1.5 block rounded-[26px] p-1.5 hover:scale-110 hover:bg-white/10 active:scale-95"
        >
          {icon}
        </a>
      )}
      <span
        className="w-full truncate text-center text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        title={bookmark.name}
      >
        {bookmark.name}
      </span>

      {editMode && (
        <>
          <button
            title="删除"
            onClick={onDelete}
            className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/90 text-[11px] text-white shadow hover:bg-red-500"
          >
            ×
          </button>
          {selected && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 p-1 text-white shadow">
              <Check size={11} />
            </span>
          )}
          <button
            title="编辑"
            onClick={onEdit}
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-slate-600 shadow hover:bg-white"
          >
            ✎
          </button>
        </>
      )}
    </div>
    </BookmarkContextMenu>
  )
}
