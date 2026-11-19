import type { ReactNode } from 'react'
import { ArrowRight, Expand, Pencil, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'

export function FolderContextMenu({ children, onDelete, onMove, onEdit, onDissolve, showDissolve }: { children: ReactNode; onDelete: () => void; onMove: () => void; onEdit: () => void; onDissolve: () => void; showDissolve: boolean }) {
  return <ContextMenu>
    <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>{children}</ContextMenuTrigger>
    <ContextMenuContent className="z-[90] min-w-44 rounded-xl bg-white/95 p-1.5 backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
      <ContextMenuItem onSelect={onEdit}><Pencil />编辑文件夹</ContextMenuItem>
      <ContextMenuItem onSelect={onMove}><ArrowRight />移动到其他空间</ContextMenuItem>
      {showDissolve && <ContextMenuItem onSelect={onDissolve}><Expand />解散文件夹</ContextMenuItem>}
      <ContextMenuItem variant="destructive" onSelect={onDelete}><Trash2 />删除卡片</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
}
