import { GripHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AppCardProps } from './types'
import { dragState } from '@/lib/dragState'

export function CardFrame({ width, height, locked, preview, onPress, onRemove, name, emoji, background, children }: AppCardProps & { name: string; emoji: string; background: string; children: ReactNode }) {
  return <section aria-label={`${name}应用卡片`} style={{ width, height }} className={`relative flex shrink-0 flex-col overflow-hidden rounded-3xl border border-white/40 text-stone-800 shadow-lg shadow-black/10 backdrop-blur-xl ${background}`}
    onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
    onClickCapture={(e) => { if (dragState.suppressClick) { e.preventDefault(); e.stopPropagation() } }}>
    <header className={`flex h-12 shrink-0 items-center gap-2 border-b border-stone-300/30 px-4 ${locked || preview ? '' : 'cursor-grab active:cursor-grabbing'}`} style={{ touchAction: 'none' }} onPointerDown={locked || preview ? undefined : onPress} title={locked ? '布局已锁定' : '拖动顶部移动卡片'}>
      <span aria-hidden="true">{emoji}</span><h3 className="text-sm font-semibold">{name}</h3><GripHorizontal size={16} className="ml-auto text-stone-400" />
      {!preview && <button type="button" aria-label={`移除${name}`} title="移除应用" className="rounded-md p-1 text-stone-400 hover:bg-stone-200/70 hover:text-red-600" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><X size={15} /></button>}
    </header>
    {children}
  </section>
}
