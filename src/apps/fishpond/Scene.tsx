import { useEffect, useId, useRef } from 'react'
import type { FishPondWeather } from './types'
import { createFish, inPond, stepFish, type PondFood, type PondPoint } from './simulation'

const trees = [[100,175,1.15],[850,190,.9],[920,375,1],[90,440,.7],[790,110,.7]]
const rocks = Array.from({ length: 46 }, (_, i) => { const a = i / 46 * Math.PI * 2; const wobble = Math.sin(i * 4.13) * 7 + Math.cos(i * 1.73) * 4; return { x: 500 + Math.cos(a) * (348 + wobble), y: 355 + Math.sin(a) * (182 + wobble * .55), rx: 10 + (i * 7 % 12), ry: 6 + (i * 5 % 7), angle: a * 180 / Math.PI + Math.sin(i) * 17, shade: ['#827e68','#a29b80','#b9ad8c','#6e7764'][i%4] } })
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
      <linearGradient id={id('lawn')} x2=".2" y2="1"><stop stopColor={night ? '#293b38' : rainy ? '#8b9a79' : '#a5ad78'} /><stop offset=".48" stopColor={night ? '#243933' : rainy ? '#72865e' : '#71884e'} /><stop offset="1" stopColor={night ? '#182e29' : rainy ? '#536d4c' : '#506b3d'} /></linearGradient>
      <radialGradient id={id('water')} cx=".4" cy=".3" r=".8"><stop stopColor={night ? '#557b7b' : rainy ? '#8ca9a0' : '#b4c4a0'} /><stop offset=".42" stopColor={night ? '#32636b' : rainy ? '#628b82' : '#69978a'} /><stop offset=".78" stopColor={night ? '#214a57' : rainy ? '#426d68' : '#416e68'} /><stop offset="1" stopColor={night ? '#153442' : '#2f5956'} /></radialGradient>
      <linearGradient id={id('roof')} x2="0" y2="1"><stop stopColor="#725f52" /><stop offset="1" stopColor="#4b4942" /></linearGradient>
      <radialGradient id={id('canopy')} cx=".3" cy=".2"><stop stopColor={night ? '#61715a' : '#b9b77b'} /><stop offset=".35" stopColor={night ? '#465b48' : '#87985b'} /><stop offset=".72" stopColor={night ? '#32483b' : '#557345'} /><stop offset="1" stopColor={night ? '#20352f' : '#38583b'} /></radialGradient>
      <linearGradient id={id('bank')} x2="0" y2="1"><stop stopColor={night ? '#746c58' : '#c7b991'} /><stop offset=".38" stopColor={night ? '#4d5846' : '#918664'} /><stop offset="1" stopColor={night ? '#344a3c' : '#586e45'} /></linearGradient>
      <linearGradient id={id('fish')} x2="0" y2="1"><stop stopColor="#f5ddaf" /><stop offset=".55" stopColor="#d58b58" /><stop offset="1" stopColor="#a95542" /></linearGradient>
      <radialGradient id={id('light')}><stop stopColor="#ffe1a4" stopOpacity=".5" /><stop offset="1" stopColor="#ffe1a4" stopOpacity="0" /></radialGradient>
      <filter id={id('shadow')} x="-50%" y="-60%" width="200%" height="230%"><feGaussianBlur stdDeviation="9" /></filter>
      <filter id={id('grain')} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="8"/><feColorMatrix values=".4 0 0 0 .3 .4 0 0 0 .3 .4 0 0 0 .3 0 0 0 .12 0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter>
      <clipPath id={id('pond')}><path d="M170 355 C174 252 292 196 439 193 C577 184 717 215 799 292 C848 340 819 425 750 478 C678 531 547 520 418 510 C283 500 171 454 160 397 C157 382 161 367 170 355Z" /></clipPath>
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
      <path d="M150 360 C157 243 288 182 435 178 C584 172 730 204 819 286 C873 337 845 438 765 493 C686 551 543 536 411 526 C267 515 153 466 143 400 C141 384 144 370 150 360Z" fill="#233d32" opacity=".3" filter={`url(#${id('shadow')})`} />
      <path d="M150 350 C158 235 286 181 436 177 C584 171 735 203 820 286 C869 335 846 430 767 486 C684 546 543 533 411 523 C268 512 154 463 143 400 C140 381 143 363 150 350Z" fill={`url(#${id('bank')})`} />
      <path d="M158 351 C166 241 291 189 437 185 C581 179 727 210 810 290 C854 333 834 424 758 476 C679 532 541 520 414 510 C279 500 166 456 155 397 C152 379 153 364 158 351Z" fill="#b3a982" opacity=".55" />
      {rocks.map((r,i)=><g key={i} transform={`translate(${r.x} ${r.y}) rotate(${r.angle})`}><ellipse cy="2" rx={r.rx+3} ry={r.ry+2} fill="#293d31" opacity=".4"/><ellipse rx={r.rx} ry={r.ry} fill={night ? '#777563' : r.shade} /><path d={`M-${r.rx*.65} -${r.ry*.15} Q0 -${r.ry*1.05} ${r.rx*.7} -${r.ry*.2}`} fill="none" stroke="#e4d7b4" strokeWidth="1.5" opacity=".38" /></g>)}
      <path d="M170 355 C174 252 292 196 439 193 C577 184 717 215 799 292 C848 340 819 425 750 478 C678 531 547 520 418 510 C283 500 171 454 160 397 C157 382 161 367 170 355Z" fill={`url(#${id('water')})`} />
      <g clipPath={`url(#${id('pond')})`}>
        <path d="M187 298 C300 266 399 269 486 284 M558 252 C629 253 696 274 754 307 M196 430 C270 455 331 466 384 468" stroke="#e9e7c9" strokeWidth="10" fill="none" opacity={night ? '.07' : rainy ? '.06' : '.19'} className="pond-reflection" />
        <path d="M206 331 C292 313 368 318 445 334 S614 359 742 325 M215 384 C302 369 368 386 451 401 S626 419 781 374" stroke={night ? '#9bc7c4' : '#d8eee0'} strokeWidth="2" fill="none" opacity={night ? '.16' : '.2'} className="pond-reflection" />
        {Array.from({length:24},(_,i)=><path key={i} d={`M${240+(i*79%480)} ${247+(i*43%220)} q${15+(i%5)*4} -4 ${30+(i%5)*5} 0`} stroke={night?'#b5d8d1':'#eff2d5'} strokeWidth={i%4===0?2:1} opacity={night?'.15':'.24'} fill="none" className="pond-glint" style={{animationDelay:`-${i*.41}s`}}/>)}
        {night && <path d="M609 242 C659 244 697 258 733 277 C702 267 675 274 639 263Z" fill="#e8e0b7" opacity=".22" className="pond-reflection" />}
        {/* Koi bodies have fins, moving tails, mottled backs and underwater shadows. */}
        {initialFish.map((f,i)=><g key={i} ref={node=>{fishNodes.current[i]=node}} transform={`translate(${f.x} ${f.y}) rotate(${f.angle*180/Math.PI})`} data-pond-fish={i}>
          <ellipse cx="-3" cy="8" rx="34" ry="9" fill="#102b27" opacity=".24" />
          <path data-tail d="M-18 0 Q-29 -3 -39 -15 Q-34 0 -39 15 Q-28 4 -18 0" fill={f.color} opacity=".82" />
          <path d="M2 -6 Q-4 -22 -17 -19L-9 0 M2 6 Q-4 22 -17 19L-9 0" fill={f.color} opacity=".55" />
          <path d="M25 0 Q14 -13 -3 -11 Q-18 -9 -24 0 Q-18 10 -3 11 Q15 13 25 0Z" fill={`url(#${id('fish')})`} />
          <path d="M-9 -8Q-1 -14 8 -7L5 -1 -7 0Z" fill={i===1?'#d17256':'#fff0ce'} opacity=".9" /><path d="M9 3Q14 -7 20 -3L16 4Z" fill={i===2?'#39463c':'#b55442'} opacity=".9" />
          {Array.from({length:6},(_,j)=><path key={j} d={`M${-9+j*4} -8q2 2 0 4`} stroke="#f8dfb4" strokeWidth=".55" opacity=".48"/>)}
          <path d="M-16 0Q0 -2 22 0" fill="none" stroke="#fff7df" strokeWidth="1" opacity=".42" />
          <circle cx="19" cy="-4" r="1.3" fill="#193a34" /><circle cx="19" cy="4" r="1.3" fill="#193a34" /><circle cx="19.4" cy="-4.3" r=".45" fill="white" />
        </g>)}
        {leaves.map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><ellipse cy="4" rx="31" ry="15" fill="#163b30" opacity=".2" /><path d="M0 0L25 -10A30 18 0 1 0 30 1Z" fill={night?'#467563':'#75a55d'} stroke="#b5c885" strokeWidth=".8" /><path d="M0 0L25 -10" stroke="#d5df9b" strokeWidth="1" opacity=".7" />{[0,1,2,3,4].map(n=><path key={n} d={`M0 0L${-20+n*13} ${n%2?-12:12}`} stroke="#a8c27b" opacity=".5" />)}</g>)}
        {[0,1].map(i=><g key={i} transform={`translate(${i?697:287} ${i?399:285})`}><ellipse cy="6" rx="14" ry="4" fill="#1e483d" opacity=".2" />{[-42,-20,0,20,42].map(a=><ellipse key={a} cy="-7" rx="4.5" ry="11" transform={`rotate(${a})`} fill={night?'#bd929d':'#f4c3c2'} stroke="#d69b9d" strokeWidth=".5" />)}<circle r="3.5" fill="#f3d69e" /><circle cy="-1" r="1.2" fill={night?'#6c8d76':'#d78a84'} /></g>)}
        {Array.from({length:6},(_,i)=><g key={i} ref={node=>{foodNodes.current[i]=node}} opacity="0" data-pond-food><ellipse rx="16" ry="8" fill="none" stroke="#e6dcc0" strokeWidth=".7" opacity=".6" />{[[-3,-2],[3,2],[0,4],[-6,3],[5,-4]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r="1.7" fill="#dcb17b" />)}</g>)}
        {rainy && Array.from({length:24},(_,i)=><ellipse key={i} cx={240+(i*97%530)} cy={230+(i*51%240)} rx="9" ry="4" fill="none" stroke="#d1e8d8" opacity=".35" className="pond-rain-ring" style={{animationDelay:`-${i*.31}s`}} />)}
      </g>
      {Array.from({length:150},(_,i)=><path key={i} d={`M${20+i*6.6} ${555+(i*17%42)}l${-4+(i%4)*2} ${-10-(i%5)*2}m4 10l${6-(i%3)*2} ${-7-(i%4)*2}`} stroke={night?'#536c53':i%3?'#8fa967':'#b5c582'} strokeWidth={i%7===0?2:1} opacity={.3+(i%4)*.08} />)}
      {trees.map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><ellipse cy="48" rx="48" ry="18" fill="#193c30" opacity=".32" /><path d="M0 47 C-4 15 5 -6 0 -37 M0 10L-25 -20M0 -3L25 -32" fill="none" stroke={night?'#655d45':'#766b4c'} strokeWidth="12" /><path d="M-4 28l7 0m-5-12l8 -1m-5-15l7 0" stroke="#b39b68" strokeWidth="2" opacity=".5"/>{[[-25,-30],[24,-40],[0,-65],[-10,-44]].map(([a,b],j)=><g key={j}><ellipse cx={a} cy={b} rx={35+j*2} ry="32" fill="#263e30" opacity=".28" transform="translate(2 5)"/><ellipse cx={a} cy={b} rx={32+j*2} ry="30" fill={`url(#${id('canopy')})`} /><ellipse cx={a-7} cy={b-8} rx="12" ry="8" fill="#d7d091" opacity={night?'.03':'.1'} /></g>)}</g>)}
      <g transform="translate(190 495) rotate(-12)"><rect x="-20" y="-10" width="70" height="18" rx="3" fill="#998264" /><path d="M-10 8v13M40 8v13" stroke="#544f41" strokeWidth="5" /></g>
      {night && <><circle cx="135" cy="65" r="21" fill="#ede8cf" /><circle cx="145" cy="57" r="19" fill="#253e48" />{Array.from({length:15},(_,i)=><circle key={i} cx={35+i*65} cy={20+i*7%80} r="1.3" fill="#eee4ba" opacity=".6" />)}</>}
      {rainy && <g className="pond-rain-fall" stroke="#c7e1d9" opacity=".3">{Array.from({length:55},(_,i)=><path key={i} d={`M${i*23%1000} ${i*71%600}l-5 17`} />)}</g>}
      <rect width="1000" height="600" filter={`url(#${id('grain')})`} opacity=".18" style={{pointerEvents:'none'}} />
    </g>
  </svg>
}
