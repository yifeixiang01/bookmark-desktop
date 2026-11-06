import type { ReactNode } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'

export function BookmarkContextMenu({ children, onEdit, onDelete, onCopy }: {
  children: ReactNode
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="z-[90] min-w-44 rounded-xl bg-white/95 p-1.5 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
        <ContextMenuItem onSelect={onEdit}><Pencil />修改</ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onDelete}><Trash2 />删除</ContextMenuItem>
        <ContextMenuItem onSelect={onCopy}><Copy />复制到其它空间</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
