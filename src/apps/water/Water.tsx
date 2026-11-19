import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, ChevronDown, Droplets, GlassWater, Plus } from 'lucide-react'
import type { WaterApp, WaterAction } from './types'
import type { ControlProps } from '../types'
import './styles.css'

const intervals = [30, 45, 60, 90, 120]

export function Water({ app, disabled, onAction }: ControlProps<WaterApp, WaterAction>) {
  const [now, setNow] = useState(() => Date.now())
  const [justDrank, setJustDrank] = useState(false)
  useEffect(() => {
    if (disabled || !app.enabled) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [app.enabled, disabled])
  useEffect(() => {
    if (!justDrank) return
    const timer = window.setTimeout(() => setJustDrank(false), 900)
    return () => window.clearTimeout(timer)
  }, [justDrank, app.cups])

  const minutes = app.nextAt === null ? 0 : Math.max(0, Math.ceil((app.nextAt - now) / 60_000))
  const goal = 8
  const progress = Math.min(100, (app.cups / goal) * 100)
  const drink = () => {
    onAction({ type: 'water-drink' })
    setJustDrank(true)
  }

  return <div className="water-widget relative flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1">
    <div className="flex shrink-0 items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#547f8a]"><span className={`water-pulse h-1.5 w-1.5 rounded-full ${app.enabled ? 'bg-[#62a99b]' : 'bg-stone-300'}`} />{!app.enabled ? '提醒已暂停' : app.due ? '现在补充水分' : `每 ${app.interval} 分钟提醒`}</div>
      <div className="flex items-center gap-1">
        <label className="relative flex items-center rounded-full bg-white/65 pl-2.5 pr-6 text-[10px] text-stone-500 transition-colors hover:bg-white">
          <span className="sr-only">喝水提醒间隔</span>
          <select aria-label="喝水提醒间隔" disabled={disabled} value={app.interval} onChange={(e) => onAction({ type: 'water-interval', minutes: Number(e.target.value) })} className="water-select appearance-none bg-transparent py-1.5 text-[10px] text-[#416e7c] outline-none">{intervals.map((n) => <option key={n} value={n}>每 {n} 分钟</option>)}</select>
          <ChevronDown size={11} className="pointer-events-none absolute right-2 text-[#7097a0]" />
        </label>
        <button type="button" disabled={disabled} aria-label={app.enabled ? '暂停喝水提醒' : '开启喝水提醒'} title={app.enabled ? '暂停提醒' : '开启提醒'} className={`app-action grid h-7 w-7 shrink-0 place-items-center rounded-full ${app.enabled ? 'text-[#527f89] hover:bg-white/80' : 'text-stone-400 hover:bg-white/80'}`} onClick={() => onAction({ type: 'water-toggle' })}>{app.enabled ? <Bell size={14} /> : <BellOff size={14} />}</button>
      </div>
    </div>

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
      <div className={`water-glass-wrap relative mb-1 grid h-[112px] w-[132px] shrink-0 place-items-center ${justDrank ? 'is-drinking' : ''}`}>
        <div className="water-glass relative z-10 flex h-[98px] w-[68px] items-center justify-center overflow-hidden rounded-b-[25px] rounded-t-[13px] border-[2px] border-white/90 bg-white/40 shadow-[inset_0_0_16px_rgba(255,255,255,0.55),0_8px_18px_rgba(71,132,144,0.12)]" aria-hidden="true">
          <div className="water-glass-shine pointer-events-none absolute inset-y-2 left-2 z-20 w-1 rounded-full bg-white/70" />
          <div className="water-liquid absolute inset-x-0 bottom-0 transition-[height] duration-700" style={{ height: `${Math.min(88, 18 + app.cups * 8.75)}%` }}>
            <div className="water-wave absolute -top-2 left-[-20%] h-4 w-[140%] rounded-[50%] bg-[#89d1cb]/80" />
            <div className="water-wave water-wave-delayed absolute -top-1.5 left-[-20%] h-4 w-[140%] rounded-[50%] bg-[#68b8b6]/60" />
          </div>
          <Droplets size={22} strokeWidth={1.5} className="relative z-10 text-[#448a98]/75 transition-transform duration-300" />
          <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5 opacity-60">{[2, 4, 6].map((cup) => <span key={cup} className={`h-1 w-2 border-b border-l border-[#4c8791]/80 ${app.cups >= cup ? 'opacity-0' : ''}`} />)}</div>
        </div>
        {justDrank && <span className="water-splash absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-[#287e87]"><Check size={20} strokeWidth={2.5} /></span>}
        <span className="absolute bottom-0 left-0 rounded-full bg-white/70 px-2 py-1 text-[9px] font-medium text-[#58838b]">{Math.min(app.cups, goal)}/{goal} 杯</span>
        <span className="absolute bottom-0 right-0 rounded-full bg-white/70 px-2 py-1 text-[9px] text-[#719398]">今日目标</span>
      </div>

      <div className="mt-0.5 text-center">
        <p key={app.cups} className="app-value text-[36px] font-light leading-none tabular-nums tracking-normal text-[#315d68]">{app.cups}<span className="ml-1 text-[13px] font-normal text-[#6e9da2]">杯</span></p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-[#789396]"><GlassWater size={11} />{app.cups >= goal ? '目标达成，继续保持' : app.enabled && app.due ? '喝一杯，给自己一点照顾' : app.enabled ? `下次提醒约 ${minutes} 分钟后` : '记得主动照顾自己'}</p>
      </div>

      <div className="mt-3 w-full max-w-[210px]">
        <div className="mb-1.5 flex items-center justify-between text-[9px] text-[#7f9b9a]"><span>今日进度</span><span>{Math.round(progress)}%</span></div>
        <div className="water-progress h-1.5 overflow-hidden rounded-full bg-white/75"><div className="h-full rounded-full bg-gradient-to-r from-[#85c7bb] to-[#5597a1] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>

    <button type="button" disabled={disabled} className="water-drink-button app-action group relative flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#397c88] text-xs font-medium text-white shadow-[0_5px_14px_rgba(52,119,130,0.22)] transition-all hover:bg-[#2e6f7b] hover:shadow-[0_7px_18px_rgba(52,119,130,0.28)] active:scale-[0.98] disabled:opacity-50" onClick={drink}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition-transform group-hover:scale-110"><Plus size={15} /></span>
      <span>{justDrank ? '记下了，做得好' : '喝了一杯'}</span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  </div>
}
