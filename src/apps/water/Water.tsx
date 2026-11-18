import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Droplets } from 'lucide-react'
import type { WaterApp, WaterAction } from './types'
import type { ControlProps } from '../types'

const button = 'app-action rounded-full bg-[#6796af] px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50'
export function Water({ app, disabled, onAction }: ControlProps<WaterApp, WaterAction>) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (disabled || !app.enabled) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [app.enabled, disabled])
  const minutes = app.nextAt === null ? 0 : Math.max(0, Math.ceil((app.nextAt - now) / 60_000))
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly gap-2 px-4 py-3">
    <div className="water-glass relative flex h-20 w-16 items-center justify-center overflow-hidden rounded-b-[24px] rounded-t-lg border-2 border-sky-200/80 bg-white/60" aria-hidden="true"><div className="absolute inset-x-0 bottom-0 bg-sky-200/70 transition-[height] duration-700" style={{ height: `${Math.min(90, 15 + app.cups * 10)}%` }} /><Droplets size={26} strokeWidth={1.4} className="relative text-sky-600/70" /></div>
    <div className="text-center"><p key={app.cups} className="app-value text-3xl font-light tabular-nums">{app.cups}<span className="ml-1 text-sm font-normal text-sky-700">杯</span></p><p className="mt-1 text-[11px] text-stone-500">今日饮水记录</p></div>
    <p role="status" className={`rounded-full px-3 py-1.5 text-xs ${app.due ? 'bg-sky-200 font-medium text-sky-900' : 'text-sky-700'}`}>{!app.enabled ? '提醒已暂停' : app.due ? '该喝水啦，给自己补充水分' : `下次提醒约 ${minutes} 分钟后`}</p>
    <button type="button" disabled={disabled} className={button} onClick={() => onAction({ type: 'water-drink' })}>喝了一杯 <Check size={13} className="ml-1 inline" /></button>
    <div className="flex items-center gap-2 text-xs text-stone-500"><label>每 <select aria-label="喝水提醒间隔" disabled={disabled} value={app.interval} onChange={(e) => onAction({ type: 'water-interval', minutes: Number(e.target.value) })} className="rounded bg-white/70 px-1 py-1 text-sky-800">{[30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} 分钟</option>)}</select></label><button type="button" disabled={disabled} aria-label={app.enabled ? '暂停喝水提醒' : '开启喝水提醒'} className="rounded-full p-2 hover:bg-sky-100" onClick={() => onAction({ type: 'water-toggle' })}>{app.enabled ? <Bell size={15} /> : <BellOff size={15} />}</button></div>
    <p className="text-[10px] text-stone-400">页面打开时提醒 · 每日自动重置杯数</p>
  </div>
}

