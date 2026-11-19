import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Partition } from '@/types/bookmark'
import './PartitionSidebar.css'

interface Props {
  partitions: Partition[]
  activeId: string
  onSelect: (id: string) => void
  revealKey?: number
}

/** 右侧竖排空间导航，参考起始页「主页/办公/休闲」侧边栏 */
export function PartitionSidebar({
  partitions, activeId, onSelect, revealKey = 0,
}: Props) {
  const navRef = useRef<HTMLElement>(null)
  const [temporarilyVisible, setTemporarilyVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useLayoutEffect(() => {
    const nav = navRef.current
    // When arrow shortcuts change spaces, keep an existing navigation focus
    // on the selected space rather than leaving an outline on the old button.
    if (nav?.contains(document.activeElement)) {
      nav.querySelector<HTMLButtonElement>('button[aria-current="page"]')?.focus({ preventScroll: true })
    }
  }, [activeId])
  useEffect(() => {
    setTemporarilyVisible(true)
    const timer = window.setTimeout(() => setTemporarilyVisible(false), 2200)
    return () => window.clearTimeout(timer)
  }, [activeId, revealKey, hovered, focused])
  const expanded = temporarilyVisible || hovered || focused
  const activeIndex = Math.max(0, partitions.findIndex((p) => p.id === activeId))
  return (
    <nav ref={navRef} aria-label="切换空间" data-expanded={expanded}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        event.stopPropagation()
        const nextIndex = Math.max(0, Math.min(partitions.length - 1,
          activeIndex + (event.key === 'ArrowDown' ? 1 : -1)))
        const next = partitions[nextIndex]
        if (!next) return
        if (next.id !== activeId) onSelect(next.id)
        navRef.current?.querySelectorAll<HTMLButtonElement>('button')[nextIndex]?.focus({ preventScroll: true })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false) }}
      className="partition-sidebar fixed right-0 top-1/2 z-20 rounded-l-3xl bg-black/20 backdrop-blur-xl border border-r-0 border-white/20 pr-2 pl-5 sm:pr-2.5">
      <span aria-hidden="true" className="partition-sidebar-handle" />
      <div className="partition-sidebar-items relative flex flex-col gap-1.5">
      <div aria-hidden="true" className="partition-sidebar-selection pointer-events-none absolute left-0 top-0 w-full rounded-2xl transition-[transform,height] duration-300 motion-reduce:transition-none"
        style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)', height: `calc((100% - ${Math.max(0, partitions.length - 1) * 6}px) / ${Math.max(1, partitions.length)})`, transform: `translateY(calc(${activeIndex * 100}% + ${activeIndex * 6}px))` }} />
      {partitions.map((p) => (
        <div key={p.id} className="relative z-10">
          <button
            onClick={() => { if (p.id !== activeId) onSelect(p.id) }}
            aria-current={p.id === activeId ? 'page' : undefined}
            title={p.name}
            className={`partition-sidebar-button box-content w-[5em] rounded-2xl px-2 py-2.5 sm:py-3 text-[11px] sm:text-[13px] leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
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
