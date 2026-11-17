import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export function SortablePartitionRow({ id, name, disabled, children }: {
  id: string
  name: string
  disabled: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative flex items-center gap-2 rounded-lg border bg-white p-2 ${isDragging ? 'z-10 border-sky-300 shadow-lg' : ''}`}>
      <button ref={setActivatorNodeRef} type="button" disabled={disabled} {...attributes} {...listeners} aria-label={`拖拽排序空间 ${name}`} title="拖拽排序，也可按空格后使用方向键调整" className="shrink-0 touch-none rounded p-1 text-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-sky-500 disabled:opacity-30 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      {children}
    </div>
  )
}
