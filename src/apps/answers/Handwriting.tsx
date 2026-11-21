import { useEffect, useId, useRef, type CSSProperties } from 'react'
import glyphs from './strokes.json'

type Glyph = { strokes: string[]; medians: number[][][] }
const data: Record<string, Glyph> = glyphs
const strokeLength = (points: number[][]) => points.reduce((sum, point, index) => index ? sum + Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) : 0, 0) + 140

export default function Handwriting({ text, animate, onComplete }: { text: string; animate: boolean; onComplete: () => void }) {
  const id = useId().replace(/:/g, '')
  const completion = useRef(onComplete)
  useEffect(() => { completion.current = onComplete }, [onComplete])
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let elapsed = 220
  const letters = Array.from(text).map((char, index) => {
    const glyph = data[char]
    const delay = elapsed
    const strokes = glyph?.medians.map((points, stroke) => {
      const length = strokeLength(points), duration = Math.min(280, 90 + length * .22), delay = elapsed
      elapsed += duration + 38
      return { path: points.map((point, i) => `${i ? 'L' : 'M'}${point[0]},${point[1]}`).join(' '), length, duration, delay, clip: `${id}-${index}-${stroke}` }
    })
    if (!glyph) elapsed += 260
    elapsed += /[，。！？、]/.test(char) ? 600 : 180
    return { char, glyph, strokes, delay }
  })
  const total = elapsed
  useEffect(() => { const timer = window.setTimeout(() => completion.current(), animate && !reduced ? total : 0); return () => window.clearTimeout(timer) }, [text, animate, reduced, total])
  const writing = animate && !reduced
  return <div className="answer-handwriting" aria-label={text}>
    {letters.map(({ char, glyph, strokes, delay }, index) => glyph && strokes ? <svg key={index} aria-hidden="true" className="answer-handwriting-glyph" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id={`${id}-ink-${index}`} x2="85%" y2="100%">
          <stop stopColor="#202920" />
          <stop offset=".42" stopColor="#333b2d" />
          <stop offset=".72" stopColor="#515749" />
          <stop offset="1" stopColor="#293128" />
        </linearGradient>
        <filter id={`${id}-paper-${index}`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="2" seed={index % 7 + 1} result="fibers" />
          <feDisplacementMap in="SourceGraphic" in2="fibers" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {writing && strokes.map(stroke => <mask key={stroke.clip} id={stroke.clip} maskUnits="userSpaceOnUse" x="-140" y="-140" width="1304" height="1304">
          <path d={stroke.path} fill="none" stroke="white" strokeWidth="245" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={stroke.length} className="answer-handwriting-stroke" style={{ '--ink-length': stroke.length, '--ink-duration': `${stroke.duration}ms`, '--ink-delay': `${stroke.delay}ms` } as CSSProperties} />
        </mask>)}
      </defs>
      <g transform="translate(0 900) scale(1 -1)" filter={`url(#${id}-paper-${index})`}>
        {glyph.strokes.map((path, i) => <g key={i} mask={writing ? `url(#${strokes[i].clip})` : undefined}>
          <path d={path} fill="none" stroke="#494d39" strokeWidth="13" opacity=".18" />
          <path d={path} fill={`url(#${id}-ink-${index})`} />
        </g>)}
      </g>
    </svg> : <span key={index} aria-hidden="true" className="answer-handwriting-punctuation" style={animate && !reduced ? { animation: `slip-punctuation 260ms ease ${delay}ms both` } : undefined}>{char}</span>)}
  </div>
}
