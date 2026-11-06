import { BookmarkContextMenu } from './BookmarkContextMenu'
import type { Bookmark } from '@/types/bookmark'
import { FaviconImg } from './FaviconImg'

interface Props {
  items: Bookmark[]
  editMode: boolean
  iconPx: number
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onCopy: (id: string) => void
  onRemove: (id: string) => void
}

/** 底部 Dock 栏：固定最高频的书签（华为桌面式：无底板，图标直接落在壁纸上） */
export function Dock({ items, editMode, iconPx, onRemove, onEdit, onDelete, onCopy }: Props) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-end gap-3 sm:gap-4 px-2 py-1">
      {items.map((b) => (
        <BookmarkContextMenu key={b.id} onEdit={() => onEdit(b.id)} onDelete={() => onDelete(b.id)} onCopy={() => onCopy(b.id)}>
        <div className="relative group">
          <a
            href={b.url}
            target="_blank"
            rel="noreferrer"
            title={b.name}
            className="block transition-transform hover:-translate-y-1.5 hover:scale-110"
          >
            <FaviconImg url={b.url} name={b.name} customIcon={b.icon} size={Math.round(iconPx * 0.93)} className="shadow-lg shadow-black/25" />
          </a>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
            {b.name}
          </span>
          {editMode && (
            <button
              title="从 Dock 移除"
              onClick={() => onRemove(b.id)}
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow hover:bg-red-400"
            >
              ×
            </button>
          )}
        </div>
        </BookmarkContextMenu>
      ))}
    </div>
  )
}
