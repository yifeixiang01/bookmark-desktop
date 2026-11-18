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
  const activeIndex = Math.max(0, partitions.findIndex((p) => p.id === activeId))
  return (
    <nav aria-label="切换空间" className="fixed right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 rounded-2xl bg-black/15 backdrop-blur-md border border-white/15 p-1 sm:p-1.5">
      <div className="relative flex flex-col gap-1">
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 w-full rounded-xl bg-white/90 shadow transition-[transform,height] duration-300 motion-reduce:transition-none"
        style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)', height: `calc((100% - ${Math.max(0, partitions.length - 1) * 4}px) / ${Math.max(1, partitions.length)})`, transform: `translateY(calc(${activeIndex * 100}% + ${activeIndex * 4}px))` }} />
      {partitions.map((p) => (
        <div key={p.id} className="relative z-10">
          <button
            onClick={() => { if (p.id !== activeId) onSelect(p.id) }}
            aria-current={p.id === activeId ? 'page' : undefined}
            title={p.name}
            className={`interactive-press box-content w-[5em] rounded-xl px-2 py-2 sm:py-2.5 text-[11px] sm:text-[13px] leading-tight transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              p.id === activeId
                ? 'text-slate-800 font-medium'
                : 'text-white/85 hover:bg-white/15'
            }`}
          >
            <span className="block w-full truncate whitespace-nowrap">{p.name}</span>
          </button>

        </div>
      ))}
      </div>
    </nav>
  )
}
