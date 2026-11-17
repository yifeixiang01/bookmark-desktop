import type { ReactNode } from 'react'
import { ArrowRight, Copy, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'

export function BookmarkContextMenu({ children, onEdit, onDelete, onCopy, onMove, pinned, onToggleDock }: {
  children: ReactNode
  onEdit: () => void
  onDelete: () => void
  onMove: () => void
  onCopy: () => void
  pinned: boolean
  onToggleDock: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="z-[90] min-w-44 rounded-xl bg-white/95 p-1.5 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
        <ContextMenuItem onSelect={onEdit}><Pencil />修改</ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onDelete}><Trash2 />删除</ContextMenuItem>
        <ContextMenuItem onSelect={onMove}><ArrowRight />移动到其他空间</ContextMenuItem>
        <ContextMenuItem onSelect={onCopy}><Copy />复制到其它空间</ContextMenuItem>
        <ContextMenuItem onSelect={onToggleDock}>
          {pinned ? <PinOff /> : <Pin />}
          {pinned ? '从 Dock 移除' : '添加到 Dock'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
