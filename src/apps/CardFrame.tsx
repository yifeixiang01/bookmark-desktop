import { GripHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AppCardProps } from './types'
import { dragState } from '@/lib/dragState'
import { AppIcon } from './AppIcon'

export function CardFrame({ app, width, height, locked, preview, onPress, onRemove, name, background, children }: AppCardProps & { name: string; background: string; children: ReactNode }) {
  return <section aria-label={`${name}应用卡片`} style={{ width, height }} className={`app-widget relative flex shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/70 text-stone-800 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl ${background}`}
    onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
    onClickCapture={(e) => { if (dragState.suppressClick) { e.preventDefault(); e.stopPropagation() } }}>
    <header className={`flex h-12 shrink-0 items-center gap-2  px-4 ${locked || preview ? '' : 'cursor-grab active:cursor-grabbing'}`} style={{ touchAction: 'none' }} onPointerDown={locked || preview ? undefined : onPress} title={locked ? '布局已锁定' : '拖动顶部移动卡片'}>
      <AppIcon type={app.type} compact /><h3 className="text-xs font-semibold tracking-wide">{name}</h3><GripHorizontal size={16} className="ml-auto text-stone-300" />
      {!preview && <button type="button" aria-label={`移除${name}`} title="移除应用" className="rounded-md p-1 text-stone-300 hover:bg-stone-200/70 hover:text-red-600" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><X size={15} /></button>}
    </header>
    {children}
  </section>
}
