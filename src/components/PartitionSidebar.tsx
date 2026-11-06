import { Plus } from 'lucide-react'
import type { Partition } from '@/types/bookmark'

interface Props {
  partitions: Partition[]
  activeId: string
  editMode: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}

/** 右侧竖排分区导航，参考起始页「主页/办公/休闲」侧边栏 */
export function PartitionSidebar({
  partitions, activeId, editMode, onSelect, onAdd, onRename, onDelete,
}: Props) {
  return (
    <nav className="fixed right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 rounded-2xl bg-black/15 backdrop-blur-md border border-white/15 p-1 sm:p-1.5">
      {partitions.map((p) => (
        <div key={p.id} className="relative group">
          <button
            onClick={() => onSelect(p.id)}
            className={`w-11 sm:w-14 rounded-xl px-1 py-2 sm:py-2.5 text-[11px] sm:text-[13px] leading-tight transition-colors ${
              p.id === activeId
                ? 'bg-white/90 text-slate-800 font-medium shadow'
                : 'text-white/85 hover:bg-white/15'
            }`}
          >
            {p.name}
          </button>
          {editMode && (
            <div className="absolute -left-1 -top-1 flex gap-0.5">
              <button
                title="重命名"
                onClick={(e) => { e.stopPropagation(); onRename(p.id) }}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-slate-600 shadow hover:bg-slate-100"
              >
                ✎
              </button>
              {partitions.length > 1 && (
                <button
                  title="删除分区"
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow hover:bg-red-400"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        title="新建分区"
        className="w-11 sm:w-14 rounded-xl py-2 sm:py-2.5 text-white/70 hover:bg-white/15 hover:text-white transition-colors flex items-center justify-center"
      >
        <Plus size={18} />
      </button>
    </nav>
  )
}
