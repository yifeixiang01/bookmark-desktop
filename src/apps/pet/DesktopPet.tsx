import { useEffect, useRef, useState } from 'react'
import { drawCat, HEIGHT, WIDTH, type Pose } from './drawCat'

const nextPose: Record<Pose, Pose> = {
  idle: 'walk', walk: 'stretch', stretch: 'sleep', sleep: 'wake',
  wake: 'idle', play: 'idle', pet: 'idle',
}
const duration: Record<Pose, number> = {
  idle: 3, walk: 7, stretch: 1.4, sleep: 9, wake: .62, play: 1.45, pet: 1.25,
}

export function DesktopPet({ onRemove }: { onRemove: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const actor = useRef<HTMLDivElement>(null)
  const motion = useRef({ x: Number.POSITIVE_INFINITY, direction: -1, pose: 'idle' as Pose, time: 0 })
  const drag = useRef<{ id: number; start: number; x: number; moved: boolean } | null>(null)
  const [controls, setControls] = useState(false)
  const [paused, setPaused] = useState(false)
  const limit = () => Math.max(0, (layer.current?.clientWidth ?? WIDTH) - WIDTH)
  const react = (pose: Pose) => {
    motion.current.pose = pose
    motion.current.time = 0
  }

  useEffect(() => {
    const element = canvas.current!
    const sprite = actor.current!
    const ctx = element.getContext('2d')
    if (!ctx) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    element.width = WIDTH * ratio
    element.height = HEIGHT * ratio
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const state = motion.current
    if (!Number.isFinite(state.x)) state.x = Math.max(0, limit() - 72)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previous = 0

    function tick(now: number) {
      if (previous === 0 || now - previous >= 30) {
        const elapsed = previous ? Math.min(.05, (now - previous) / 1000) : 0
        previous = now
        const edge = limit()
        if (!paused && !controls && !drag.current && !reduced.matches) {
          state.time += elapsed
          if (state.time >= duration[state.pose]) {
            state.pose = nextPose[state.pose]
            state.time = 0
          }
          if (state.pose === 'walk') {
            state.x += state.direction * 51 * elapsed
            if (state.x <= 0 || state.x >= edge) state.direction = state.x <= 0 ? 1 : -1
          }
        }
        state.x = Math.max(0, Math.min(edge, state.x))
        sprite.style.transform = `translateX(${state.x}px)`
        drawCat(ctx!, reduced.matches ? 'idle' : state.pose, reduced.matches ? 0 : state.time, state.direction)
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [controls, paused])

  return (
    <div ref={layer} className="pointer-events-none fixed inset-x-0 bottom-8 z-10 h-[122px]" onKeyDown={(event) => {
      if (event.key === 'Escape') setControls(false)
    }}>
      <div ref={actor} className="absolute bottom-0 left-0 h-[122px] w-[164px]">
        <canvas ref={canvas} aria-hidden="true" className="block h-full w-full" />
        <button
          type="button"
          aria-label="橘白猫桌宠"
          aria-expanded={controls}
          title="点击摸摸猫，拖动换位置，右键打开操作"
          className="pointer-events-auto absolute bottom-4 left-8 h-[84px] w-[100px] touch-none rounded-[45%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            drag.current = { id: event.pointerId, start: event.clientX, x: motion.current.x, moved: false }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const current = drag.current
            if (!current || current.id !== event.pointerId) return
            const delta = event.clientX - current.start
            if (!current.moved && Math.abs(delta) < 5) return
            if (!current.moved) react('idle')
            current.moved = true
            motion.current.x = Math.max(0, Math.min(limit(), current.x + delta))
          }}
          onPointerUp={(event) => {
            const current = drag.current
            if (!current || current.id !== event.pointerId) return
            drag.current = null
            if (!current.moved) react(motion.current.pose === 'sleep' ? 'wake' : 'pet')
          }}
          onLostPointerCapture={() => { drag.current = null }}
          onClick={(event) => {
            if (event.detail === 0) setControls((value) => !value)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            setControls((value) => !value)
          }}
        />
        {controls && (
          <div aria-label="桌宠操作" role="group" className="pointer-events-auto absolute bottom-full left-1 w-36 space-y-1 rounded-xl border border-orange-100 bg-orange-50 p-1.5 text-sm text-stone-800 shadow-lg">
            <button type="button" className="block w-full rounded-lg px-2 py-1 text-left hover:bg-orange-100" onClick={() => {
              setPaused(false)
              react('play')
              setControls(false)
            }}>玩毛线球</button>
            <button type="button" className="block w-full rounded-lg px-2 py-1 text-left hover:bg-orange-100" onClick={() => {
              setPaused(!paused)
              react('idle')
              setControls(false)
            }}>{paused ? '恢复活动' : '暂停活动'}</button>
            <button type="button" className="block w-full rounded-lg px-2 py-1 text-left hover:bg-orange-100" onClick={onRemove}>收起桌宠</button>
          </div>
        )}
      </div>
    </div>
  )
}
