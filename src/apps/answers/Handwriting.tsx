import { useEffect, useId, useRef, type CSSProperties } from 'react'
import glyphs from './strokes.json'

type Glyph = { strokes: string[]; medians: number[][][] }
const data: Record<string, Glyph> = glyphs
const strokeLength = (points: number[][]) => points.reduce((sum, point, index) => index ? sum + Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) : 0, 0) + 140

export default function Handwriting({ text, animate, onComplete }: { text: string; animate: boolean; onComplete: () => void }) {
  const id = useId().replace(/:/g, '')
  const completion = useRef(onComplete); completion.current = onComplete
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let elapsed = 220
  const letters = Array.from(text).map((char, index) => {
    const glyph = data[char]
    const strokes = glyph?.medians.map((points, stroke) => {
      const length = strokeLength(points), duration = Math.min(280, 90 + length * .22), delay = elapsed
      elapsed += duration + 38
      return { path: points.map((point, i) => `${i ? 'L' : 'M'}${point[0]},${point[1]}`).join(' '), length, duration, delay, clip: `${id}-${index}-${stroke}` }
    })
    elapsed += /[，。！？、]/.test(char) ? 600 : 180
    return { char, glyph, strokes }
  })
  const total = elapsed
  useEffect(() => { const timer = window.setTimeout(() => completion.current(), animate && !reduced ? total : 0); return () => window.clearTimeout(timer) }, [text, animate, reduced, total])
  return <div className="answer-handwriting" aria-label={text}>
    {letters.map(({ char, glyph, strokes }, index) => glyph && strokes ? <svg key={index} aria-hidden="true" className="answer-handwriting-glyph" viewBox="0 0 1024 1024">
      <defs>{glyph.strokes.map((path, stroke) => <clipPath key={stroke} id={strokes[stroke].clip}><path d={path} /></clipPath>)}</defs>
      <g transform="translate(0 900) scale(1 -1)">{strokes.map((stroke, i) => <g key={i} clipPath={`url(#${stroke.clip})`}><path d={stroke.path} fill="none" stroke="currentColor" strokeWidth="200" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={stroke.length} className={animate && !reduced ? 'answer-handwriting-stroke' : undefined} style={{ '--ink-length': stroke.length, '--ink-duration': `${stroke.duration}ms`, '--ink-delay': `${stroke.delay}ms` } as CSSProperties} /></g>)}</g>
    </svg> : <span key={index} aria-hidden="true" className="answer-handwriting-punctuation">{char}</span>)}
  </div>
}
