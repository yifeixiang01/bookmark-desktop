import type { Partition } from '@/types/bookmark'

interface Props {
  partitions: Partition[]
  activeId: string
  onSelect: (id: string) => void
}

/** 右侧竖排空间导航，参考起始页「主页/办公/休闲」侧边栏 */
export function PartitionSidebar({
  partitions, activeId, onSelect,
}: Props) {
  return (
    <nav className="fixed right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 rounded-2xl bg-black/15 backdrop-blur-md border border-white/15 p-1 sm:p-1.5">
      {partitions.map((p) => (
        <div key={p.id} className="relative group">
          <button
            onClick={() => onSelect(p.id)}
            title={p.name}
            className={`box-content w-[5em] rounded-xl px-2 py-2 sm:py-2.5 text-[11px] sm:text-[13px] leading-tight transition-colors ${
              p.id === activeId
                ? 'bg-white/90 text-slate-800 font-medium shadow'
                : 'text-white/85 hover:bg-white/15'
            }`}
          >
            <span className="block w-full truncate whitespace-nowrap">{p.name}</span>
          </button>

        </div>
      ))}

    </nav>
  )
}
