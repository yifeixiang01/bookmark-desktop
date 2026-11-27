import { useEffect, useState } from 'react'
import { GripHorizontal, Pause, Play, RotateCcw, X } from 'lucide-react'
import { AppIcon } from '../AppIcon'
import type { PomodoroApp } from './types'
import { durationOf, remainingSeconds, type PomodoroAction } from './model'
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

export function PomodoroTile({ app, width, height, editMode, locked, preview, onPress, onAction, onRemove }: Props) {
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
  const resting = app.mode === 'break'
  const accent = resting ? '#719888' : '#da7c65'
  const circumference = 2 * Math.PI * 76
  const disabled = !!editMode || !!preview
  return (
    <section aria-label="番茄钟应用卡片" className="app-widget relative flex shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#faf9f6] text-[#343a36] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.28)]" style={{ width, height }}
      onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}
      onClickCapture={(e) => { if (dragState.suppressClick) { e.preventDefault(); e.stopPropagation() } }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-[0.08] blur-2xl" style={{ background: accent }} />
      <header className={`relative flex h-12 shrink-0 items-center gap-2 px-4 ${locked || preview ? '' : 'cursor-grab active:cursor-grabbing'}`} style={{ touchAction: 'none' }} onPointerDown={locked || preview ? undefined : onPress} title={locked ? '布局已锁定' : '拖动顶部移动卡片'}>
        <AppIcon type="pomodoro" compact /><h3 className="text-xs font-semibold tracking-wide">番茄钟</h3><GripHorizontal size={14} className="ml-auto text-stone-300" />
        {!preview && <button type="button" aria-label="移除番茄钟" title="移除应用" className="rounded-full p-1 text-stone-300 transition hover:bg-stone-200/60 hover:text-stone-600" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}><X size={14} /></button>}
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col items-center px-4 pb-3">
        <div className="pomodoro-mode-switch flex shrink-0 rounded-full bg-[#eeede8] p-[3px] text-[11px]">
          {(['focus', 'break'] as const).map((mode) => <button key={mode} type="button" disabled={disabled} aria-label={mode === 'focus' ? '专注 25 分钟' : '休息 5 分钟'} aria-pressed={app.mode === mode} onClick={() => onAction?.(mode)} className={`rounded-full px-5 py-1.5 transition-all ${app.mode === mode ? 'bg-white font-semibold text-[#414841] shadow-sm' : 'text-stone-400 hover:text-stone-600'} disabled:cursor-default`}>{mode === 'focus' ? '专注' : '休息'}<span className="ml-1.5 font-normal opacity-50">{mode === 'focus' ? '25′' : '5′'}</span></button>)}
        </div>
        <div className="relative my-1 flex min-h-0 w-full flex-1 items-center justify-center">
          <svg viewBox="0 0 180 180" aria-hidden="true" className="absolute h-full max-h-[190px] w-full max-w-[190px] -rotate-90">
            <circle cx="90" cy="90" r="76" fill="none" stroke="#eae8e1" strokeWidth="3" />
            <circle cx="90" cy="90" r="76" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} className="transition-[stroke-dashoffset,stroke] duration-500" />
          </svg>
          <div className="relative text-center">
            <p className="mb-1 text-[9px] font-medium tracking-[0.22em] text-stone-400">{resting ? 'TAKE A BREATH' : 'TIME TO FOCUS'}</p>
            <p className="font-sans text-[46px] font-light leading-none tracking-[-0.055em] tabular-nums">{time}</p>
            <p role="status" className="mt-2 text-[10px] text-stone-400">{app.finished ? '本轮已完成' : running ? (resting ? '慢下来，深呼吸' : '专注于眼前的一件事') : '留一点时间，给自己'}</p>
          </div>
          <div role="progressbar" aria-label="本轮进度" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="sr-only" />
        </div>
        <div className="flex w-full shrink-0 items-center justify-center gap-2.5">
          <button type="button" disabled={disabled} onClick={() => onAction?.('toggle')} className="flex h-9 min-w-32 items-center justify-center gap-2 rounded-full px-5 text-xs font-medium text-white shadow-sm transition hover:brightness-95 active:scale-95 disabled:opacity-50" style={{ background: accent }}>{running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}{running ? '暂停' : app.finished ? '再来一轮' : '开始'}</button>
          <button type="button" disabled={disabled} onClick={() => onAction?.('reset')} aria-label="重置番茄钟" title="重置本轮" className="grid h-9 w-9 place-items-center rounded-full border border-stone-200/80 text-stone-400 transition hover:bg-stone-100 active:rotate-[-30deg] disabled:opacity-50"><RotateCcw size={14} /></button>
        </div>
        <div className="mt-3 flex shrink-0 items-center gap-2 text-[10px] text-stone-400"><span className="flex gap-1" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i} className="h-1 w-1 rounded-full" style={{ background: i < app.completed % 4 || app.completed > 0 && app.completed % 4 === 0 ? accent : '#deddd6' }} />)}</span><span>已完成 {app.completed} 次专注{editMode && ' · 编辑中'}</span></div>
      </div>
    </section>
  )
}
