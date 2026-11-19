import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Waves } from 'lucide-react'
import { DYNAMIC_WALLPAPERS, WALLPAPERS } from './wallpapers/catalog'

function useWallpaperCarousel() {
  const listRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const update = () => setEdges({
      start: list.scrollLeft <= 1,
      end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
    })
    const observer = new ResizeObserver(update)
    observer.observe(list)
    list.addEventListener('scroll', update, { passive: true })
    update()
    return () => { observer.disconnect(); list.removeEventListener('scroll', update) }
  }, [])

  const move = (direction: number) => {
    const list = listRef.current
    if (!list) return
    list.scrollBy({
      left: direction * list.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return { listRef, edges, move }
}

const arrowClass = 'group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition-[transform,background-color,border-color,box-shadow,color] duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-slate-400 enabled:hover:text-slate-950 enabled:hover:shadow-[0_6px_16px_rgba(15,23,42,0.14)] enabled:active:translate-y-0 enabled:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-default disabled:opacity-30 disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none'

export function WallpaperPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { listRef, edges, move } = useWallpaperCarousel()

  return <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:gap-3">
    <button type="button" aria-label="向左浏览壁纸" title="向左浏览壁纸" disabled={edges.start} className={arrowClass} onClick={() => move(-1)}><ChevronLeft size={23} strokeWidth={1.8} className="transition-transform duration-200 group-enabled:group-hover:-translate-x-0.5 motion-reduce:transition-none" /></button>
    <div ref={listRef} aria-label="内置壁纸列表" className="no-scrollbar grid snap-x snap-mandatory grid-flow-col grid-rows-2 gap-2 overflow-x-auto overscroll-x-contain py-1" style={{ gridAutoColumns: 'clamp(110px, calc((100% - 16px) / 3), 180px)' }}>
      {WALLPAPERS.map((w) => <button
        key={w.id}
        type="button"
        aria-label={`使用壁纸背景：${w.name}`}
        aria-pressed={value === w.id}
        title={w.name}
        onClick={() => onChange(w.id)}
        className={`relative aspect-video w-full snap-start overflow-hidden rounded-lg border-2 transition-[border-color,box-shadow] hover:shadow-sm ${value === w.id ? 'border-slate-800' : 'border-transparent hover:border-slate-300'}`}
        style={{ background: `linear-gradient(180deg,rgba(10,24,32,0.18),rgba(10,24,32,0.05) 48%,rgba(7,18,24,0.38)), url("${w.image}") center / cover, ${w.fallback}` }}
      >
        {value === w.id && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white"><Check size={10} /></span>}
      </button>)}
    </div>
    <button type="button" aria-label="向右浏览壁纸" title="向右浏览壁纸" disabled={edges.end} className={arrowClass} onClick={() => move(1)}><ChevronRight size={23} strokeWidth={1.8} className="transition-transform duration-200 group-enabled:group-hover:translate-x-0.5 motion-reduce:transition-none" /></button>
  </div>
}

export function DynamicWallpaperPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { listRef, edges, move } = useWallpaperCarousel()
  return <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:gap-3">
    <button type="button" aria-label="向左浏览动态壁纸" disabled={edges.start} className={arrowClass} onClick={() => move(-1)}><ChevronLeft size={23} strokeWidth={1.8} /></button>
    <div ref={listRef} aria-label="动态壁纸列表" className="no-scrollbar grid grid-flow-col snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain py-1" style={{ gridAutoColumns: 'clamp(220px, 65%, 320px)' }}> 
    {DYNAMIC_WALLPAPERS.map((wallpaper) => <button
      key={wallpaper.id}
      type="button"
      aria-label={`使用动态壁纸：${wallpaper.name}`}
      aria-pressed={value === wallpaper.id}
      onClick={() => onChange(wallpaper.id)}
      className={`group snap-start overflow-hidden rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${value === wallpaper.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400'}`}
    >
      <div className="relative aspect-[2.4/1] overflow-hidden bg-teal-900">
        <img src={wallpaper.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105" />
        <span className="absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] items-center gap-1 rounded-full bg-slate-950/45 px-2 py-1 text-[10px] text-white backdrop-blur-sm"><Waves size={12} className="shrink-0" /><span className="truncate">{wallpaper.name}</span></span>
        {value === wallpaper.id && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-white"><Check size={14} /></span>}
      </div>
    </button>)}
    </div>
    <button type="button" aria-label="向右浏览动态壁纸" disabled={edges.end} className={arrowClass} onClick={() => move(1)}><ChevronRight size={23} strokeWidth={1.8} /></button>
  </div>
}
