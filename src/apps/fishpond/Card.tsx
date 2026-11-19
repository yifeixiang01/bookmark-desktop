import type { AppCardProps } from '../types'
import { X, Fish } from 'lucide-react'
import { FishPond } from './FishPond'

export function Card(props: AppCardProps) {
  if (props.app.type !== 'fishpond') return null
  return <section aria-label="我的鱼塘应用卡片" data-weather={props.app.weather} className="app-widget pond-card flex flex-col overflow-hidden rounded-[28px] border border-white/40 shadow-xl" style={{ width: props.width, height: props.height }} onPointerDown={e=>e.stopPropagation()} onContextMenu={e=>e.stopPropagation()}>
    <header className="flex h-10 shrink-0 items-center gap-2 bg-[#e9eddf] px-5 text-[#567062]"><Fish size={15} /><h3 className="text-xs font-medium">我的鱼塘</h3><span className="ml-auto text-[10px] opacity-60">后院 · 独立分页</span>{!props.preview && <button type="button" aria-label="移除我的鱼塘" title="移除应用" onClick={props.onRemove} className="ml-2 rounded p-1 hover:bg-black/5"><X size={14} /></button>}</header>
    <FishPond app={props.app} disabled={!!props.editMode || !!props.preview} onAction={props.onAction ?? (() => {})} />
  </section>
}
