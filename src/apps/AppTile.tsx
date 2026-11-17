import { GripHorizontal, X } from 'lucide-react'
import type { DesktopApp, AppAction } from './types'
import { appName } from './registry'
import { dragState } from '@/lib/dragState'
import { Note } from './note/Note'
import { Todo } from './todo/Todo'
import { Water } from './water/Water'
import { Woodfish } from './woodfish/Woodfish'
import { PomodoroTile } from './pomodoro/PomodoroTile'

interface Props {
  app: DesktopApp
  width: number
  height: number
  editMode?: boolean
  locked?: boolean
  preview?: boolean
  onPress?: (e: React.PointerEvent) => void
  onAction?: (action: AppAction) => void
  onRemove?: () => void
}
const colors = { cream: 'bg-[#fff7cf]/95', pink: 'bg-[#ffe4ec]/95', green: 'bg-[#e0f2df]/95' }
export function AppTile(props: Props) {
  const { app, width, height, editMode, locked, preview, onPress, onAction, onRemove } = props
  if (app.type === 'pomodoro') return <PomodoroTile {...props} app={app} onAction={onAction} />
  const name = appName(app.type)
  const disabled = !!editMode || !!preview
  const control = { disabled, onAction: onAction ?? (() => {}) }
  const background = app.type === 'note' ? colors[app.color] : app.type === 'water' ? 'bg-sky-50/95' : app.type === 'woodfish' ? 'bg-[#fff5e5]/95' : 'bg-[#f5faf6]/95'
  return <section aria-label={`${name}应用卡片`} style={{ width, height }} className={`relative flex shrink-0 flex-col overflow-hidden rounded-3xl border border-white/40 text-stone-800 shadow-lg shadow-black/10 backdrop-blur-xl ${background}`}
    onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
    onClickCapture={(e) => { if (dragState.suppressClick) { e.preventDefault(); e.stopPropagation() } }}>
    <header className={`flex h-12 shrink-0 items-center gap-2 border-b border-stone-300/30 px-4 ${locked || preview ? '' : 'cursor-grab active:cursor-grabbing'}`} style={{ touchAction: 'none' }} onPointerDown={locked || preview ? undefined : onPress} title={locked ? '布局已锁定' : '拖动顶部移动卡片'}>
      <span aria-hidden="true">{{ note: '📝', todo: '✅', water: '💧', woodfish: '🪵' }[app.type]}</span><h3 className="text-sm font-semibold">{name}</h3><GripHorizontal size={16} className="ml-auto text-stone-400" />
      {!preview && <button type="button" aria-label={`移除${name}`} title="移除应用" className="rounded-md p-1 text-stone-400 hover:bg-stone-200/70 hover:text-red-600" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><X size={15} /></button>}
    </header>
    {app.type === 'note' ? <Note app={app} {...control} /> : app.type === 'todo' ? <Todo app={app} {...control} /> : app.type === 'water' ? <Water app={app} {...control} /> : <Woodfish app={app} {...control} />}
  </section>
}
