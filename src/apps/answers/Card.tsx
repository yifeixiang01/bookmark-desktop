import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Check, Feather } from 'lucide-react'
import type { AppCardProps } from '../types'
import { CardFrame } from '../CardFrame'
import { ANSWERS, nextAnswer } from './answers'
import './styles.css'

const loadHandwriting = () => import('./Handwriting')
const Handwriting = lazy(loadHandwriting)

export function Card(props: AppCardProps) {
  const { app } = props
  const [phase, setPhase] = useState<'idle' | 'leaving' | 'waiting' | 'writing' | 'fading'>('idle')
  const [reveal, setReveal] = useState<{ text: string; key: number } | null>(null)
  const [collected, setCollected] = useState(false)
  const [canCollect, setCanCollect] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef(false)
  useEffect(() => () => { clearTimeout(timer.current) }, [])
  if (app.type !== 'answers') return null
  // Saved answers are only used for draw history. The paper starts blank on mount.
  const answer = reveal?.text ?? null
  const busy = phase !== 'idle'
  const draw = () => {
    if (pending.current || props.preview || props.editMode) return
    pending.current = true
    setCollected(false)
    setCanCollect(false)
    void loadHandwriting()
    const index = nextAnswer(app.answer, Math.random(), app.recent)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const write = () => {
      props.onAction?.({ type: 'answers-draw', index })
      setReveal({ text: ANSWERS[index], key: Date.now() })
      setPhase('writing')
    }
    const listen = () => {
      setReveal(null)
      setPhase('waiting')
      timer.current = setTimeout(write, reduced ? 0 : 1600)
    }
    if (answer && !reduced) { setPhase('leaving'); timer.current = setTimeout(listen, 850) }
    else listen()
  }
  const finish = (allowCollect = true) => { pending.current = false; setPhase('idle'); if (allowCollect && reveal) setCanCollect(true) }
  const collect = () => {
    if (busy || !answer || props.preview || props.editMode) return
    pending.current = true
    void navigator.clipboard?.writeText(answer).catch(() => {})
    setPhase('fading')
    setCanCollect(false)
    timer.current = setTimeout(() => {
      setReveal(null)
      setCollected(true)
      finish(false)
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1600)
  }
  return <CardFrame {...props} name="答案之书" background="bg-[#f8f1e2] answer-slip-frame">
    <div className="answer-slip" data-phase={phase} data-has-answer={!!answer && !collected}>
      <div className="answer-slip-paper" aria-hidden="true" />
      <div className="answer-slip-heading"><span className="answer-slip-line" /><span>一念 · 一答</span><span className="answer-slip-line" /></div>
      <div className="answer-slip-space" aria-busy={busy}>
        <div className="answer-slip-wait" aria-hidden={phase !== 'waiting'}><span className="answer-slip-inkdrop" /><p>听见了，容我想一想。</p></div>
        <div className="answer-slip-answer-layer">
          {reveal ? <Suspense fallback={null}><Handwriting key={reveal.key} text={reveal.text} animate onComplete={() => { if (phase === 'writing') finish() }} /></Suspense> : null}
        </div>
        <div className="answer-slip-invitation"><Feather size={24} strokeWidth={1} /><p>心里，想一个问题。</p><span>不必说出口，我在这里。</span></div>
      </div>
      <div className="answer-slip-tools">
        {canCollect && !busy && answer && !collected && !props.preview && !props.editMode
          ? <button type="button" onClick={collect} aria-label="收下这句"><Check size={12} />收下这句</button>
          : <span aria-hidden="true" />}
      </div>
      <button type="button" onPointerEnter={() => { void loadHandwriting() }} onFocus={() => { void loadHandwriting() }} onClick={draw} disabled={busy || props.preview || props.editMode} className="answer-slip-action" data-state={phase === 'idle' ? (answer && !collected ? 'ready' : 'start') : phase} aria-busy={busy}>
        <Feather size={14} strokeWidth={1.6} /><span>{phase === 'waiting' || phase === 'leaving' ? '静候片刻' : phase === 'writing' ? '正在落笔' : phase === 'fading' ? '墨迹渐淡' : answer ? '再问一次' : '遇见答案'}</span>
      </button>
      <span className="answer-slip-footnote">一页灵感，随心解读</span>
      <span className="sr-only" role="status" aria-live="polite">{phase === 'idle' ? answer : phase === 'waiting' ? '正在倾听你的问题' : '答案正在纸上书写'}</span>
    </div>
  </CardFrame>
}
