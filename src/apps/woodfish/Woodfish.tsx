import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import type { WoodfishApp, WoodfishAction } from './types'
import type { ControlProps } from '../types'

export function Woodfish({ app, disabled, onAction }: ControlProps<WoodfishApp, WoodfishAction>) {
  const [hit, setHit] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const context = useRef<AudioContext | null>(null)
  useEffect(() => () => { clearTimeout(timer.current); void context.current?.close() }, [])
  const knock = () => {
    onAction({ type: 'woodfish-hit' }); setHit((n) => n + 1)
    clearTimeout(timer.current); timer.current = setTimeout(() => setHit(0), 650)
    if (!app.sound) return
    try {
      const ctx = context.current ??= new AudioContext()
      void ctx.resume().catch(() => {})
      const oscillator = ctx.createOscillator(), gain = ctx.createGain()
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(650, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.14)
      gain.gain.setValueAtTime(0.25, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.2)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    } catch { /* 音频不可用时保留敲击和计数。 */ }
  }
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly px-4 py-3">
    <p className="text-[11px] tracking-[0.2em] text-amber-800/60">放下杂念 · 此刻安心</p>
    <div className="relative"><span role="status" className={`pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-amber-700 transition-opacity ${hit ? 'opacity-100' : 'opacity-0'}`}>功德 +1</span>
      <button type="button" aria-label="敲木鱼" disabled={disabled} onClick={knock} className="relative grid h-28 w-36 place-items-center rounded-[45%] border-b-8 border-amber-950/30 bg-gradient-to-br from-amber-500 to-amber-800 shadow-lg shadow-amber-900/20 transition-transform active:scale-90 disabled:opacity-70"><span className="h-12 w-24 rotate-[-15deg] rounded-[50%] border-b-[9px] border-amber-950/65" /><span className="absolute -right-2 top-1 h-3 w-16 rotate-[-35deg] rounded-full bg-amber-950 shadow-sm" /></button>
    </div>
    <div className="text-center"><p className="text-2xl font-semibold tabular-nums text-amber-950">{app.count}</p><p className="mt-1 text-[11px] text-amber-800/60">累计功德</p></div>
    <button type="button" disabled={disabled} onClick={() => onAction({ type: 'woodfish-sound' })} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-amber-800/70 hover:bg-amber-100" aria-label={app.sound ? '关闭木鱼音效' : '开启木鱼音效'}>{app.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}{app.sound ? '音效开启' : '音效关闭'}</button>
  </div>
}

