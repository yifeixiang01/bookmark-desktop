import { useEffect, useState } from 'react'
import { GripHorizontal, Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import type { PomodoroApp } from '@/types/bookmark'
import { durationOf, remainingSeconds, type PomodoroAction } from '@/lib/desktopApps'
import { dragState } from '@/lib/dragState'

interface Props {
  app: PomodoroApp
  width: number
  height: number
  editMode?: boolean
  locked?: boolean
  preview?: boolean
  onPress?: (e: React.PointerEvent) => void
  onAction?: (action: PomodoroAction) => void
  onRemove?: () => void
}

export function AppTile({ app, width, height, editMode, locked, preview, onPress, onAction, onRemove }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (preview || app.endsAt === null) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 250)
    window.addEventListener('focus', tick)
    return () => { window.clearInterval(id); window.removeEventListener('focus', tick) }
  }, [app.endsAt, preview])
  const seconds = remainingSeconds(app, now)
  const running = app.endsAt !== null
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  const progress = Math.max(0, Math.min(100, (1 - seconds / durationOf(app.mode)) * 100))
  const disabled = !!editMode || !!preview
  return (
    <section aria-label="番茄钟应用卡片" className="relative flex shrink-0 flex-col overflow-hidden rounded-3xl border border-white/40 bg-[#fff8f3]/95 text-stone-800 shadow-lg shadow-black/10 backdrop-blur-xl" style={{ width, height }}
      onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
      onClickCapture={(e) => { if (dragState.suppressClick) { e.preventDefault(); e.stopPropagation() } }}>
      <header className={`flex h-12 shrink-0 items-center gap-2 border-b border-stone-200/60 px-4 ${locked || preview ? '' : 'cursor-grab active:cursor-grabbing'}`} style={{ touchAction: 'none' }} onPointerDown={locked || preview ? undefined : onPress} title={locked ? '布局已锁定' : '拖动顶部移动卡片'}>
        <Timer size={17} className="text-orange-600" /><h3 className="text-sm font-semibold">番茄钟</h3><GripHorizontal size={16} className="ml-auto text-stone-400" />
        {!preview && <button type="button" aria-label="移除番茄钟" title="移除应用" className="rounded-md p-1 text-stone-400 hover:bg-stone-200/70 hover:text-red-600" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><X size={15} /></button>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly px-4 py-3">
        <div className="flex rounded-full bg-stone-200/60 p-1 text-xs">
          {(['focus', 'break'] as const).map((mode) => <button key={mode} type="button" disabled={disabled} aria-pressed={app.mode === mode} onClick={() => onAction?.(mode)} className={`rounded-full px-4 py-1.5 transition-colors ${app.mode === mode ? 'bg-white font-medium text-orange-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'} disabled:cursor-default`}>{mode === 'focus' ? '专注 25 分钟' : '休息 5 分钟'}</button>)}
        </div>
        <div className="text-center"><p className="font-mono text-[48px] font-medium leading-tight tracking-tight tabular-nums">{time}</p><p role="status" className="mt-1 h-5 text-xs text-stone-500">{app.finished ? (app.mode === 'focus' ? '专注完成，休息一下吧' : '休息结束，准备好了吗') : running ? (app.mode === 'focus' ? '把这一刻，留给重要的事' : '放松一下，深呼吸') : '准备好后，开始这一轮'}</p></div>
        <div className="h-1.5 w-4/5 overflow-hidden rounded-full bg-orange-100" role="progressbar" aria-label="本轮进度" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-orange-400 transition-[width]" style={{ width: `${progress}%` }} /></div>
        <div className="flex items-center gap-2"><button type="button" disabled={disabled} onClick={() => onAction?.('toggle')} className="flex items-center gap-2 rounded-full bg-stone-800 px-6 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50">{running ? <Pause size={14} /> : <Play size={14} />}{running ? '暂停' : app.finished ? '再来一轮' : '开始'}</button><button type="button" disabled={disabled} onClick={() => onAction?.('reset')} aria-label="重置番茄钟" title="重置本轮" className="rounded-full bg-stone-200/60 p-2.5 text-stone-600 hover:bg-stone-200 disabled:opacity-50"><RotateCcw size={14} /></button></div>
        <p className="text-[11px] text-stone-400">已完成 {app.completed} 次专注{editMode && ' · 编辑中'}</p>
      </div>
    </section>
  )
}
