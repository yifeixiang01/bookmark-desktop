import { useEffect, useId, useRef } from 'react'
import type { FishPondWeather } from './types'
import { createFish, inPond, stepFish, type PondFood, type PondPoint } from './simulation'

const trees = [[100,175,1.15],[850,190,.9],[920,375,1],[90,440,.7],[790,110,.7]]
const rocks = Array.from({ length: 38 }, (_, i) => { const a = i / 38 * Math.PI * 2; return { x: 500 + Math.cos(a) * 346, y: 355 + Math.sin(a) * 181, r: 10 + (i * 7 % 12), angle: a * 180 / Math.PI } })
const leaves = [[280,300,1],[310,278,.7],[690,405,1],[725,385,.65],[655,428,.6]]
const initialFish = createFish()

export function Scene({ weather, disabled, active, onFeed }: { weather: FishPondWeather; disabled: boolean; active: boolean; onFeed: (point: PondPoint) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const fishNodes = useRef<(SVGGElement | null)[]>([])
  const foodNodes = useRef<(SVGGElement | null)[]>([])
  const fish = useRef(createFish())
  const food = useRef<PondFood[]>([])
  const lastFeed = useRef(0)
  const prefix = useId().replace(/:/g, '')
  const id = (name: string) => `${prefix}-${name}`
  const night = weather === 'night'
  const rainy = weather === 'rainy'

  useEffect(() => {
    let frame = 0, last = 0
    let visible = true
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0 })
    if (svg.current) observer.observe(svg.current)
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      if (!active || !visible || document.hidden) { last = 0; return }
      const dt = last ? Math.min((time-last)/1000, .05) : 0
      last = time
      stepFish(fish.current, food.current, dt, time)
      fish.current.forEach((f,i) => {
        fishNodes.current[i]?.setAttribute('transform', `translate(${f.x} ${f.y}) rotate(${f.angle*180/Math.PI})`)
        const tail = fishNodes.current[i]?.querySelector('[data-tail]')
        tail?.setAttribute('transform', `rotate(${Math.sin(time/140+f.phase)*19} -21 0)`)
      })
      food.current = food.current.filter(p => p.bites > 0 && p.expiresAt > time)
      foodNodes.current.forEach((node,i) => {
        const p = food.current[i]
        if (!node) return
        node.style.opacity = p ? String(Math.min(1, (p.expiresAt-time)/1000, p.bites)) : '0'
        if (p) node.setAttribute('transform', `translate(${p.x} ${p.y})`)
      })
    }
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [active])

  const feed = (point: PondPoint) => {
    const now = performance.now()
    if (disabled || !inPond(point) || now-lastFeed.current < 220) return
    lastFeed.current = now
    food.current = [...food.current.filter(p => p.bites > 0 && p.expiresAt > now), { x: point.x, y: point.y, id: now, expiresAt: now+12000, bites: 3 }].slice(-6)
    onFeed(point)
  }

  return <svg ref={svg} viewBox="0 0 1000 600" preserveAspectRatio="none" className="pond-landscape" role="button" tabIndex={disabled ? -1 : 0} aria-label="点击鱼塘喂鱼" aria-disabled={disabled}
    onClick={e => { const matrix=svg.current?.getScreenCTM(); if (!matrix) return; const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()); feed(point) }}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); feed({ x: 500, y: 355 }) } }}>
    <defs>
      <linearGradient id={id('lawn')} x2=".2" y2="1"><stop stopColor={night ? '#253e48' : rainy ? '#74978c' : '#a7ba89'} /><stop offset="1" stopColor={night ? '#152f38' : rainy ? '#3f6c61' : '#658957'} /></linearGradient>
      <radialGradient id={id('water')} cx=".4" cy=".3" r=".8"><stop stopColor={night ? '#467888' : rainy ? '#78a99c' : '#93c1a5'} /><stop offset=".6" stopColor={night ? '#214b60' : '#477e72'} /><stop offset="1" stopColor={night ? '#122c42' : '#244e4c'} /></radialGradient>
      <linearGradient id={id('roof')} x2="0" y2="1"><stop stopColor="#725f52" /><stop offset="1" stopColor="#4b4942" /></linearGradient>
      <radialGradient id={id('canopy')} cx=".3" cy=".2"><stop stopColor={night ? '#4a6864' : '#9baa66'} /><stop offset=".55" stopColor={night ? '#304d4b' : '#5b804d'} /><stop offset="1" stopColor={night ? '#1b3939' : '#335d43'} /></radialGradient>
      <radialGradient id={id('light')}><stop stopColor="#ffe1a4" stopOpacity=".5" /><stop offset="1" stopColor="#ffe1a4" stopOpacity="0" /></radialGradient>
      <filter id={id('shadow')} x="-50%" y="-60%" width="200%" height="230%"><feGaussianBlur stdDeviation="7" /></filter>
      <filter id={id('texture')}><feTurbulence baseFrequency=".065" numOctaves="3" seed="4" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".08" /></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light" /></filter>
      <clipPath id={id('pond')}><ellipse cx="500" cy="355" rx="330" ry="165" /></clipPath>
    </defs>
    <rect width="1000" height="600" fill={`url(#${id('lawn')})`} />
    <g aria-hidden="true">
      <path d="M0 530 Q90 460 155 460 M790 250 Q900 300 1000 260" stroke={night ? '#435956' : '#c9c29e'} strokeWidth="55" fill="none" opacity=".7" />
      <path d="M0 528 Q90 458 155 458 M790 248 Q900 298 1000 258" stroke="#ddd0ac" strokeWidth="1" strokeDasharray="3 8" fill="none" opacity=".4" />
      <g opacity=".65" stroke={night ? '#394f49' : '#a4af83'} strokeWidth="5"><path d="M0 125 H1000" />{Array.from({length:24},(_,i)=><path key={i} d={`M${i*45} 105 v60`} />)}</g>
      {/* Modest garden house and shaded porch, kept behind the pond. */}
      <g transform="translate(600 15)">
        <ellipse cx="130" cy="166" rx="180" ry="30" fill="#18392d" opacity=".25" filter={`url(#${id('shadow')})`} />
        <path d="M30 70 H255 V170 H30Z" fill={night ? '#6d6e61' : '#d6c7a5'} />
        <path d="M0 80 L53 15 H235 L283 80Z" fill={`url(#${id('roof')})`} />
        {Array.from({length:9},(_,i)=><path key={i} d={`M${25+i*27} 78 L${65+i*18} 20`} stroke="#aea28a" strokeWidth="2" opacity=".3" />)}
        <path d="M-8 81 H290" stroke="#433f37" strokeWidth="6" />
        <rect x="65" y="100" width="53" height="55" rx="2" fill={night ? '#e9b56a' : '#779391'} stroke="#826f55" strokeWidth="5" /><path d="M91 100V155 M65 127H118" stroke="#826f55" strokeWidth="3" />
        <rect x="175" y="96" width="43" height="74" fill="#635b4b" /><rect x="185" y="106" width="23" height="30" fill={night ? '#f6c77b' : '#9fa992'} />
        <path d="M20 174H267" stroke="#a7987b" strokeWidth="12" />
        {night && <ellipse cx="130" cy="170" rx="180" ry="90" fill={`url(#${id('light')})`} />}
      </g>
      <ellipse cx="503" cy="374" rx="360" ry="186" fill="#183f37" opacity=".24" filter={`url(#${id('shadow')})`} />
      <ellipse cx="500" cy="355" rx="355" ry="189" fill={night ? '#53635d' : '#a8aa8a'} />
      {rocks.map((r,i)=><g key={i} transform={`translate(${r.x} ${r.y}) rotate(${r.angle})`}><ellipse rx={r.r+6} ry={r.r*.8} fill={night ? '#65716c' : ['#adaf9b','#bab9a3','#929d8c'][i%3]} /><path d={`M-${r.r} -2 Q0 -${r.r*.9} ${r.r} -2`} fill="none" stroke="#e0dbc1" strokeWidth="2" opacity=".35" /></g>)}
      <ellipse cx="500" cy="355" rx="330" ry="165" fill={`url(#${id('water')})`} />
      <g clipPath={`url(#${id('pond')})`}>
        <path d="M200 290 Q430 230 740 305 M210 325 Q430 275 780 330" stroke="#d9e8c6" strokeWidth="7" fill="none" opacity=".08" className="pond-reflection" />
        {night && <ellipse cx="625" cy="280" rx="65" ry="13" fill="#e2ecda" opacity=".16" className="pond-reflection" />}
        {/* Koi bodies have fins, moving tails, mottled backs and underwater shadows. */}
        {initialFish.map((f,i)=><g key={i} ref={node=>{fishNodes.current[i]=node}} transform={`translate(${f.x} ${f.y}) rotate(${f.angle*180/Math.PI})`} data-pond-fish={i}>
          <ellipse cx="-3" cy="6" rx="35" ry="11" fill="#102f2b" opacity=".2" />
          <path data-tail d="M-19 0 Q-30 -3 -38 -14 Q-33 0 -38 14 Q-29 3 -19 0" fill={f.color} opacity=".8" />
          <path d="M0 -5 Q-10 -23 -17 -17L-10 0 M0 5 Q-10 23 -17 17L-10 0" fill={f.color} opacity=".5" />
          <path d="M24 0 Q13 -13 -4 -10 Q-18 -8 -23 0 Q-17 9 -4 10 Q14 13 24 0Z" fill={f.color} />
          <path d="M-12 -6Q0 -12 10 -5L5 3 -6 1Z" fill={i===1?'#d17256':'#fff0ce'} opacity=".8" /><path d="M12 -4L18 -2 17 3 10 5Z" fill={i===2?'#3b4941':'#b55442'} opacity=".8" />
          <path d="M-17 0Q0 -3 20 0" fill="none" stroke="#fff7df" strokeWidth="1" opacity=".3" />
          <circle cx="18" cy="-4" r="1.2" fill="#193a34" /><circle cx="18" cy="4" r="1.2" fill="#193a34" />
        </g>)}
        {leaves.map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><ellipse cy="4" rx="31" ry="15" fill="#163b30" opacity=".2" /><path d="M0 0L25 -10A30 18 0 1 0 30 1Z" fill={night?'#467563':'#75a55d'} stroke="#b5c885" strokeWidth=".8" />{[0,1,2,3].map(n=><path key={n} d={`M0 0L${-20+n*13} ${n%2?-12:12}`} stroke="#a8c27b" opacity=".5" />)}</g>)}
        {[0,1].map(i=><g key={i} transform={`translate(${i?697:287} ${i?399:285})`}><ellipse cy="6" rx="14" ry="4" fill="#1e483d" opacity=".2" />{[-42,-20,0,20,42].map(a=><ellipse key={a} cy="-7" rx="4.5" ry="11" transform={`rotate(${a})`} fill={night?'#bd929d':'#f4c3c2'} stroke="#d69b9d" strokeWidth=".5" />)}<circle r="3.5" fill="#f3d69e" /></g>)}
        {Array.from({length:6},(_,i)=><g key={i} ref={node=>{foodNodes.current[i]=node}} opacity="0" data-pond-food><ellipse rx="16" ry="8" fill="none" stroke="#e6dcc0" strokeWidth=".7" opacity=".6" />{[[-3,-2],[3,2],[0,4],[-6,3],[5,-4]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r="1.7" fill="#dcb17b" />)}</g>)}
        {rainy && Array.from({length:24},(_,i)=><ellipse key={i} cx={240+(i*97%530)} cy={230+(i*51%240)} rx="9" ry="4" fill="none" stroke="#d1e8d8" opacity=".35" className="pond-rain-ring" style={{animationDelay:`-${i*.31}s`}} />)}
      </g>
      {Array.from({length:50},(_,i)=><path key={i} d={`M${35+i*19} ${555+(i*17%37)}l-4 -12m4 12l6 -9`} stroke={night?'#426257':'#92ab6d'} strokeWidth="1.5" opacity=".55" />)}
      {trees.map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><ellipse cy="48" rx="42" ry="16" fill="#193c30" opacity=".25" /><path d="M0 45V-28M0 0L-22 -21M0 -8L22 -30" stroke={night?'#5b6252':'#726e4e'} strokeWidth="9" />{[[-25,-30],[24,-40],[0,-65],[-10,-44]].map(([a,b],j)=><ellipse key={j} cx={a} cy={b} rx={32+j*2} ry="32" fill={`url(#${id('canopy')})`} />)}</g>)}
      <g transform="translate(190 495) rotate(-12)"><rect x="-20" y="-10" width="70" height="18" rx="3" fill="#998264" /><path d="M-10 8v13M40 8v13" stroke="#544f41" strokeWidth="5" /></g>
      {night && <><circle cx="135" cy="65" r="21" fill="#ede8cf" /><circle cx="145" cy="57" r="19" fill="#253e48" />{Array.from({length:15},(_,i)=><circle key={i} cx={35+i*65} cy={20+i*7%80} r="1.3" fill="#eee4ba" opacity=".6" />)}</>}
      {rainy && <g className="pond-rain-fall" stroke="#c7e1d9" opacity=".3">{Array.from({length:55},(_,i)=><path key={i} d={`M${i*23%1000} ${i*71%600}l-5 17`} />)}</g>}
      <rect width="1000" height="600" filter={`url(#${id('texture')})`} opacity=".12" style={{pointerEvents:'none'}} />
    </g>
  </svg>
}
