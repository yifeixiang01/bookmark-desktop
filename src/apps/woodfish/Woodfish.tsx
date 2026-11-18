import './styles.css'
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import type { WoodfishApp, WoodfishAction } from './types'
import type { ControlProps } from '../types'

function playWoodfish(ctx: AudioContext) {
  const now = ctx.currentTime
  const output = ctx.createGain()
  output.gain.setValueAtTime(0.72, now)
  output.connect(ctx.destination)

  // A short filtered noise burst supplies the wooden mallet attack.
  const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.035), ctx.sampleRate)
  const noise = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006))
  }
  const strike = ctx.createBufferSource()
  const strikeFilter = ctx.createBiquadFilter()
  const strikeGain = ctx.createGain()
  strike.buffer = noiseBuffer
  strikeFilter.type = 'bandpass'
  strikeFilter.frequency.value = 1850
  strikeFilter.Q.value = 0.8
  strikeGain.gain.setValueAtTime(0.42, now)
  strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045)
  strike.connect(strikeFilter).connect(strikeGain).connect(output)
  strike.start(now)

  // Inharmonic resonances reproduce the hollow body instead of an electronic pitch sweep.
  const pitch = 0.96 + Math.random() * 0.08
  const modes = [
    { frequency: 248, gain: 0.48, decay: 0.28 },
    { frequency: 573, gain: 0.24, decay: 0.16 },
    { frequency: 1040, gain: 0.1, decay: 0.09 },
  ]
  for (const mode of modes) {
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(mode.frequency * pitch, now)
    oscillator.detune.setValueAtTime((Math.random() - 0.5) * 12, now)
    envelope.gain.setValueAtTime(mode.gain, now)
    envelope.gain.exponentialRampToValueAtTime(0.001, now + mode.decay)
    oscillator.connect(envelope).connect(output)
    oscillator.start(now)
    oscillator.stop(now + mode.decay + 0.02)
  }

  window.setTimeout(() => output.disconnect(), 400)
}

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
      playWoodfish(ctx)
    } catch { /* 音频不可用时保留敲击和计数。 */ }
  }
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly px-4 py-3">
    <p className="text-[11px] tracking-[0.2em] text-amber-800/60">放下杂念 · 此刻安心</p>
    <div className="relative"><span key={hit} role="status" className={`merit-feedback pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-amber-700 transition-opacity ${hit ? 'opacity-100' : 'opacity-0'}`}>功德 +1</span>
      <button type="button" aria-label="敲木鱼" disabled={disabled} onClick={knock} className="relative grid h-28 w-36 place-items-center rounded-[45%] border-b-8 border-amber-950/30 bg-gradient-to-br from-[#c89456] to-[#8d5c32] shadow-lg shadow-amber-900/20 transition-transform active:scale-90 disabled:opacity-70"><span className="h-12 w-24 rotate-[-15deg] rounded-[50%] border-b-[9px] border-amber-950/65" /><span className="absolute -right-2 top-1 h-3 w-16 rotate-[-35deg] rounded-full bg-amber-950 shadow-sm" /></button>
    </div>
    <div className="text-center"><p key={app.count} className="app-value text-2xl font-light tabular-nums text-amber-950">{app.count}</p><p className="mt-1 text-[11px] text-amber-800/60">累计功德</p></div>
    <button type="button" disabled={disabled} onClick={() => onAction({ type: 'woodfish-sound' })} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-amber-800/70 hover:bg-amber-100" aria-label={app.sound ? '关闭木鱼音效' : '开启木鱼音效'}>{app.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}{app.sound ? '音效开启' : '音效关闭'}</button>
  </div>
}

