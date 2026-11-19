import { useEffect, useRef } from 'react'
import { dragState } from '@/lib/dragState'
import { createKoiSprite } from './pondRendering'
import { createLotus, paintPondBed } from './pondScenery'
import { PondWaves } from './pondWaves'
import { wallpaperPixelRatio } from './renderBudget'

type Fish = { x: number; y: number; angle: number; phase: number; size: number; color: number }
type Ripple = { x: number; y: number; born: number }
const TAU = Math.PI * 2


/** Painted lotus pond with cached scenery and a lightweight 30 fps koi layer. */
export function KoiPondWallpaper() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    const bed = document.createElement('canvas')
    const ground = bed.getContext('2d', { alpha: false })
    if (!ground) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1, height = 1, frame = 0, last = 0, time = 0
    let seed = 92
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    const fish: Fish[] = Array.from({ length: 6 }, (_, i) => ({
      x: .18 + (i % 3) * .3 + random() * .08,
      y: .23 + Math.floor(i / 3) * .45 + random() * .1,
      angle: random() * TAU,
      phase: i * 2.37, size: 12 + random() ** 2 * 14, color: i % 5,
    }))
    let waves = new PondWaves(1, 1)
    const reflection = document.createElement('canvas')
    const reflectionCtx = reflection.getContext('2d', { willReadFrequently: true })!
    const distortion = document.createElement('canvas')
    const distortionCtx = distortion.getContext('2d')!
    let reflectionPixels: Uint8ClampedArray
    let distortionPixels: ImageData
    let waveTime = 0, waveRemaining = 0
    let target: Ripple | null = null

    const lotuses = [
      { x: .045, y: .14, size: 70, angle: .7, flower: true },
      { x: .115, y: .225, size: 42, angle: 2, flower: false },
      { x: .805, y: .055, size: 36, angle: -.8, flower: true },
      { x: .985, y: .87, size: 78, angle: 2.8, flower: true },
      { x: .997, y: .61, size: 39, angle: .2, flower: false },
      { x: .015, y: .66, size: 35, angle: -.5, flower: false },
    ].map((leaf, i) => ({ ...leaf, image: createLotus(leaf.size, leaf.flower, 21 + i * 7) }))
    const sprites = fish.map((f, i) => createKoiSprite(f.color, i))
    const shadows = sprites.map(sprite => {
      const shadow = document.createElement('canvas')
      shadow.width = sprite.width; shadow.height = sprite.height
      const paint = shadow.getContext('2d')!
      paint.filter = 'blur(5px)'; paint.drawImage(sprite, 0, 0)
      paint.globalCompositeOperation = 'source-in'; paint.fillStyle = '#183d2d'
      paint.fillRect(0, 0, shadow.width, shadow.height)
      return shadow
    })

    const resize = () => {
      width = window.innerWidth; height = window.innerHeight
      const ratio = wallpaperPixelRatio(width, height)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      paintPondBed(bed, width, height)
      waves = new PondWaves(width, height)
      reflection.width = distortion.width = waves.cols
      reflection.height = distortion.height = waves.rows
      // Read the static bed once, never force GPU readback of the live canvas.
      reflectionCtx.drawImage(bed, 0, 0, waves.cols, waves.rows)
      reflectionPixels = reflectionCtx.getImageData(0, 0, waves.cols, waves.rows).data
      distortionPixels = distortionCtx.createImageData(waves.cols, waves.rows)
      waveTime = 0; waveRemaining = 0
    }

    const drawFish = (f: Fish, i: number) => {
      const sprite = sprites[i], scale = f.size / 80
      const beat = time * (2.2 + 12 / f.size) + f.phase
      ctx.save(); ctx.translate(f.x * width, f.y * height); ctx.rotate(f.angle)
      ctx.globalAlpha = .16
      ctx.drawImage(shadows[i], -150 * scale + 4, -72 * scale + 6, 280 * scale, 144 * scale)
      ctx.globalAlpha = .96
      // Tail motion travels from the shoulders down the spine, including the body.
      for (let x = 0; x < 280; x += 4) {
        const rear = Math.max(0, (205 - x) / 205)
        const offset = Math.sin(beat - rear * 2.1) * rear ** 2 * 17 * scale
        ctx.drawImage(sprite, x, 0, 4, 144, (x - 150) * scale, -72 * scale + offset, 4.3 * scale, 144 * scale)
      }
      ctx.restore()
    }

    const render = (dt: number) => {
      time += dt
      ctx.drawImage(bed, 0, 0, width, height)
      if (waveRemaining > 0 && !reduced.matches) {
        waveRemaining -= dt
        waveTime += dt * 3.5 / waves.step
        // Fixed substeps keep propagation stable at different rendering rates.
        while (waveTime >= 1 / 60) { waves.advance(); waveTime -= 1 / 60 }
        const source = reflectionPixels
        const output = distortionPixels
        output.data.fill(0)
        const w = waves.cols, h = waves.rows, field = waves.height
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const index = y * w + x, p = index * 4
          const nx = field[index - 1] - field[index + 1], ny = field[index - w] - field[index + w]
          const slope = Math.abs(nx) + Math.abs(ny)
          if (slope < .002) continue
          const sampleX = Math.max(0, Math.min(w - 1, Math.round(x + nx * 3)))
          const sampleY = Math.max(0, Math.min(h - 1, Math.round(y + ny * 3)))
          const src = (sampleY * w + sampleX) * 4
          const light = Math.max(-36, Math.min(48, (nx * -.65 + ny * -.8) * 85))
          for (let c = 0; c < 3; c++) output.data[p + c] = source[src + c] + light
          output.data[p + 3] = Math.min(210, slope * 600)
        }
        distortionCtx.putImageData(output, 0, 0)
        ctx.drawImage(distortion, 0, 0, width, height)
      }
      for (const [i, f] of fish.entries()) {
        const destination = target && time - target.born < 8 ? target : null
        const desired = destination ? Math.atan2(destination.y - f.y * height, destination.x - f.x * width) : f.angle + Math.sin(time * .22 + f.phase) * .035
        const turn = Math.atan2(Math.sin(desired - f.angle), Math.cos(desired - f.angle))
        f.angle += Math.max(-1, Math.min(1, turn)) * dt * .6
        if (f.x < .07 || f.x > .93 || f.y < .09 || f.y > .91) {
          const inward = Math.atan2((.5 - f.y) * height, (.5 - f.x) * width)
          f.angle += Math.atan2(Math.sin(inward - f.angle), Math.cos(inward - f.angle)) * dt * 1.3
        }
        f.x += Math.cos(f.angle) * dt * (13 + f.size * .2) / width
        f.y += Math.sin(f.angle) * dt * (13 + f.size * .2) / height
        drawFish(f, i)
      }
      // Sparse, broad surface glints keep the painted water calm.
      ctx.save(); ctx.lineWidth = 1.3
      for (let i = 0; i < 7; i++) {
        const x = (i * .173 + .09) % 1 * width
        const y = (.2 + (i * .217 % .65)) * height
        ctx.strokeStyle = `rgba(197,228,195,${.035 + (Math.sin(time * .28 + i) + 1) * .018})`
        ctx.beginPath(); ctx.moveTo(x - 85, y + Math.sin(time * .21 + i) * 18)
        ctx.bezierCurveTo(x - 60, y - 90, x + 30, y - 80, x + 45, y - 190); ctx.stroke()
      }
      ctx.restore()
      const botanicalScale = Math.max(.55, Math.min(1.1, width / 1440))
      for (const [i, leaf] of lotuses.entries()) {
        ctx.save(); ctx.translate(width * leaf.x, height * leaf.y + Math.sin(time * .33 + i) * 1.4)
        ctx.rotate(leaf.angle + Math.sin(time * .18 + i) * .012)
        const size = leaf.image.width * botanicalScale
        ctx.drawImage(leaf.image, -size / 2, -size / 2, size, size); ctx.restore()
      }
      const shade = ctx.createLinearGradient(0, 0, 0, height)
      shade.addColorStop(0, 'rgba(37,75,66,.025)'); shade.addColorStop(.5, 'rgba(37,75,66,0)'); shade.addColorStop(1, 'rgba(37,75,66,.045)')
      ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height)
    }
    const tick = (now: number) => {
      if (document.hidden) return
      if (now - last >= 33) { render(last ? Math.min((now - last) / 1000, .08) : 0); last = now }
      if (!reduced.matches) frame = requestAnimationFrame(tick)
    }
    const restart = () => { cancelAnimationFrame(frame); last = 0; if (reduced.matches) { waves.clear(); waveRemaining = 0 } if (!document.hidden) { render(0); if (!reduced.matches) frame = requestAnimationFrame(tick) } }
    const onResize = () => { resize(); restart() }
    const click = (event: MouseEvent) => {
      if (reduced.matches || dragState.active || dragState.suppressClick) return
      const el = event.target
      if (!(el instanceof Element) || !el.closest('[data-wallpaper-surface]') || el.closest('button,a,input,textarea,[role="dialog"],[role="menu"],[data-wallpaper-anchor]')) return
      target = { x: event.clientX, y: event.clientY, born: time }
      waves.disturb(event.clientX, event.clientY)
      waveRemaining = 12
    }
    resize(); restart()
    window.addEventListener('resize', onResize)
    window.addEventListener('click', click)
    document.addEventListener('visibilitychange', restart)
    reduced.addEventListener('change', restart)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize); window.removeEventListener('click', click)
      document.removeEventListener('visibilitychange', restart); reduced.removeEventListener('change', restart)
    }
  }, [])
  return <canvas data-wallpaper-scene="koi-pond" ref={ref} className="absolute inset-0 h-full w-full" />
}
