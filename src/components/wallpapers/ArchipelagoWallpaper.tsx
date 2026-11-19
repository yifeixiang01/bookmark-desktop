import { useEffect, useRef } from 'react'
import { dragState } from '@/lib/dragState'
import { anchorDistance, coastNoise, smoothUnion, type IslandAnchor } from './islandGeometry'
import { drawPalmTree } from './palmTree'
import { reefDensity, seaNoise } from './seaTexture'
import { wallpaperPixelRatio } from './renderBudget'

import { advanceTraveler, drawTraveler, type SeaTraveler } from './seaLife'
type Ripple = { x: number; y: number; born: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const palette = [
  { d: -50, rgb: [249, 246, 231] },
  { d: -15, rgb: [247, 242, 223] },
  { d: -3, rgb: [237, 228, 204] },
  { d: 1, rgb: [235, 227, 204] },
  { d: 9, rgb: [219, 234, 212] },
  { d: 25, rgb: [169, 225, 207] },
  { d: 55, rgb: [113, 210, 198] },
  { d: 100, rgb: [84, 195, 191] },
  { d: 160, rgb: [77, 187, 187] },
  { d: 220, rgb: [76, 181, 183] },
]

/** A local, procedural scene. Geometry is sampled from the visible desktop only. */
export function ArchipelagoWallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    const terrain = document.createElement('canvas')
    const terrainCtx = terrain.getContext('2d', { alpha: false })
    if (!terrainCtx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, cols = 0, rows = 0, step = 3
    let field = new Float32Array(0)
    let reefs = new Float32Array(0)
    let waterTone = new Float32Array(0)
    let pixels: ImageData
    let anchors: IslandAnchor[] = []
    let targets: IslandAnchor[] = []
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastFrame = 0, lastSample = -1000, lastTerrain = -1000, time = 0
    let dirty = true
    let initialized = false
    let retiringId = 0
    const palms = new Map<number, { x: number; y: number; islandId: string; unsuitable: number; opacity: number }>()
    const palmCandidates = new Map<number, { islandId: string; stableFor: number }>()
    const ripples: Ripple[] = []
    let press: { x: number; y: number; valid: boolean } | null = null
    const travelers: SeaTraveler[] = Array.from({ length: 4 }, (_, i) => ({
      x: 0, y: 0, angle: i * 1.7, speed: i < 2 ? 0 : 3, phase: i * 2.37 + 1,
      kind: i < 2 ? 'boat' : 'turtle', ready: false,
    }))

    const sample = () => {
      const surface = document.querySelector('[data-wallpaper-surface]')
      const found: IslandAnchor[] = []
      if (surface) for (const el of surface.querySelectorAll<HTMLElement>('[data-wallpaper-anchor]')) {
        const rect = el.getBoundingClientRect()
        if (el.dataset.wallpaperDragging) {
          // Leave the source island in place to dissolve. Its retired identity
          // lets a fresh island grow at the drop point without flying there.
          const source = anchors.find(a => a.id === el.dataset.wallpaperAnchor)
          if (source) { source.id = `retiring-${++retiringId}`; dirty = true }
          continue
        }
        const scroller = el.closest('.snap-mandatory')
        const clip = scroller?.getBoundingClientRect()
        // Off-page icons must never generate islands through the scroll viewport.
        if (clip && (rect.right < clip.left + 10 || rect.left > clip.right - 10 || rect.bottom < clip.top || rect.top > clip.bottom)) continue
        if (rect.right < 0 || rect.left > width || rect.bottom < 0 || rect.top > height || !rect.width || !rect.height) continue
        found.push({ id: el.dataset.wallpaperAnchor!, x: rect.x + rect.width / 2,
          y: rect.y + rect.height * 0.43, rx: rect.width * 0.48 + 23, ry: rect.height * 0.43 + 24 })
      }
      // An empty desktop keeps open water and a few quiet, uninhabited islands.
      if (!found.length && !dragState.active) found.push(
        { id: 'empty-a', x: width * 0.18, y: height * 0.64, rx: 92, ry: 65 },
        { id: 'empty-b', x: width * 0.72, y: height * 0.77, rx: 65, ry: 46 },
        { id: 'empty-c', x: width * 0.79, y: height * 0.29, rx: 43, ry: 34 },
      )
      if (found.length !== targets.length || found.some((a, i) => {
        const old = targets[i]
        return !old || old.id !== a.id || Math.abs(old.x - a.x) > 0.1 || Math.abs(old.y - a.y) > 0.1 || old.rx !== a.rx || old.ry !== a.ry
      })) dirty = true
      targets = found
      if (!initialized || reduced.matches) anchors = found.map(a => ({ ...a }))
      initialized = true
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const ratio = wallpaperPixelRatio(width, height)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      // Bound terrain work independently of screen resolution and DPR.
      step = Math.max(2.5, width / 460, height / 300)
      cols = Math.ceil(width / step)
      rows = Math.ceil(height / step)
      terrain.width = cols
      terrain.height = rows
      field = new Float32Array(cols * rows)
      reefs = new Float32Array(cols * rows)
      waterTone = new Float32Array(cols * rows)
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * step, y = (row + 0.5) * step, index = row * cols + col
        reefs[index] = reefDensity(x, y)
        waterTone[index] = seaNoise(x * 0.012, y * 0.012) - 0.5
      }
      pixels = terrainCtx.createImageData(cols, rows)
      sample()
      dirty = true
      lastTerrain = -1000
    }

    const morph = (dt: number) => {
      const amount = reduced.matches ? 1 : 1 - Math.exp(-dt * 1.25)
      const ebb = reduced.matches ? 1 : 1 - Math.exp(-dt * 0.95)
      const targetIds = new Set(targets.map(a => a.id))
      for (const target of targets) {
        let current = anchors.find(a => a.id === target.id)
        if (!current) { current = { ...target, rx: 1, ry: 1 }; anchors.push(current) }
        for (const key of ['x', 'y', 'rx', 'ry'] as const) {
          if (Math.abs(target[key] - current[key]) > 0.15) dirty = true
          current[key] = Math.abs(target[key] - current[key]) < 0.15 ? target[key] : lerp(current[key], target[key], amount)
        }
      }
      anchors = anchors.filter(a => {
        if (targetIds.has(a.id)) return true
        a.rx = lerp(a.rx, 0, ebb); a.ry = lerp(a.ry, 0, ebb)
        dirty = true
        return a.rx > 1 && a.ry > 1
      })
    }

    const buildTerrain = () => {
      // Only rasterize near each island. Dense desktops should not pay for
      // every icon at every ocean pixel; beyond 220px the sea color is constant.
      field.fill(220)
      for (const anchor of anchors) {
        const left = Math.max(0, Math.floor((anchor.x - anchor.rx - 222) / step))
        const right = Math.min(cols - 1, Math.ceil((anchor.x + anchor.rx + 222) / step))
        const top = Math.max(0, Math.floor((anchor.y - anchor.ry - 222) / step))
        const bottom = Math.min(rows - 1, Math.ceil((anchor.y + anchor.ry + 222) / step))
        for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
          const index = row * cols + col
          field[index] = smoothUnion(field[index], anchorDistance((col + 0.5) * step, (row + 0.5) * step, anchor))
        }
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * step, y = (row + 0.5) * step
        const index = row * cols + col
        const distance = field[index] + coastNoise(x, y)
        field[index] = distance
        let high = 1
        while (high < palette.length - 1 && distance > palette[high].d) high++
        const a = palette[high - 1], b = palette[high]
        const mix = Math.max(0, Math.min(1, (distance - a.d) / (b.d - a.d)))
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
        const grain = ((hash - Math.floor(hash)) - 0.5) * (distance < 0 ? 2.2 : 0.9)
        const submerged = Math.max(0, Math.min(1, (distance - 24) / 48))
        const reef = reefs[index] * submerged
        for (let c = 0; c < 3; c++) {
          const color = lerp(a.rgb[c], b.rgb[c], mix)
          pixels.data[index * 4 + c] = color + grain + waterTone[index] * (distance > 0 ? 10 : 3) - reef * [33, 43, 47][c]
        }
        pixels.data[index * 4 + 3] = 255
      }
      terrainCtx.putImageData(pixels, 0, 0)
      dirty = false
    }

    const seaDistance = (x: number, y: number) => {
      const col = Math.max(0, Math.min(cols - 1, Math.floor(x / step)))
      const row = Math.max(0, Math.min(rows - 1, Math.floor(y / step)))
      return field[row * cols + col] ?? 10000
    }

    const draw = (dt: number) => {
      ctx.drawImage(terrain, 0, 0, width, height)
      // Small sunlit wavelets, restricted to water so they never cross the land.
      ctx.lineWidth = 1
      for (let i = 0; i < 85; i++) {
        const x = ((i * 139.7 + time * 3) % (width + 50)) - 25
        const y = ((i * 73.3) % height) + Math.sin(time * 0.5 + i) * 4
        if (seaDistance(x, y) < 23 || seaDistance(x + 25, y) < 23) continue
        ctx.strokeStyle = `rgba(193,243,232,${0.05 + (Math.sin(time * 0.9 + i) + 1) * 0.045})`
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12, y - 3, x + 25, y); ctx.stroke()
      }
      // A travelling glint along the shore uses the same cached signed distance.
      ctx.fillStyle = 'rgba(255,255,245,0.36)'
      for (let row = 0; row < rows; row += 2) for (let col = 0; col < cols; col += 2) {
        const d = field[row * cols + col]
        const tide = 3 + Math.sin(time * 0.55) * 1.5
        if (d > tide && d < tide + 1.6 && Math.sin(col * 0.025 + row * 0.04 - time * 0.45) > -0.15) ctx.fillRect(col * step, row * step, step * 1.4, step * 0.4)
      }
      for (const traveler of travelers) {
        advanceTraveler(traveler, dt, time, width, height, seaDistance)
        const alpha = Math.max(0, Math.min(1, (seaDistance(traveler.x, traveler.y) - 10) / 30))
        if (traveler.ready && alpha > 0) drawTraveler(ctx, traveler, time, alpha * (traveler.kind === 'turtle' ? 0.68 : 1))
      }
      // Keep established trees rooted instead of choosing a new set every frame.
      // A wider survival band prevents shoreline changes from flickering trees.
      const clearOfIcons = (x: number, y: number) => !targets.some(a =>
        Math.abs(x - a.x) < a.rx - 24 && Math.abs(y - a.y) < a.ry - 24)
      const activeIslands = new Set(targets.map(a => a.id))
      const islandAt = (x: number, y: number) => {
        let closest: IslandAnchor | undefined
        let distance = Infinity
        for (const anchor of anchors) {
          const next = anchorDistance(x, y, anchor)
          if (next < distance) { distance = next; closest = anchor }
        }
        // Retiring sandbars still contribute terrain, but must not sprout trees.
        return closest && activeIslands.has(closest.id) ? closest : undefined
      }
      for (const [seed, palm] of palms) {
        if (!activeIslands.has(palm.islandId)) {
          palms.delete(seed)
          continue
        }
        const depth = seaDistance(palm.x, palm.y)
        // Root positions must stay on dry sand, even while the coast changes.
        if (depth >= -4) {
          palms.delete(seed)
          continue
        }
        const supported = depth < -4 && clearOfIcons(palm.x, palm.y)
        palm.unsuitable = supported ? 0 : palm.unsuitable + dt
        if (palm.unsuitable > 1.5 || reduced.matches && !supported) {
          palms.delete(seed)
          continue
        }
        palm.opacity = reduced.matches ? 1 : Math.min(1, palm.opacity + dt / 0.85)
        ctx.globalAlpha = palm.opacity
        drawPalmTree(ctx, palm.x, palm.y, seed, time)
        ctx.globalAlpha = 1
      }
      for (let i = 0; i < 650; i++) {
        const x = ((i * 173.37 + 33) % 997) / 997 * width
        const y = ((i * 251.71 + 91) % 991) / 991 * height
        const depth = seaDistance(x, y)
        if (palms.has(i)) continue
        const island = islandAt(x, y)
        if (!island || depth > -16 || depth < -34 || !clearOfIcons(x, y)) {
          palmCandidates.delete(i)
          continue
        }
        const candidate = palmCandidates.get(i)
        const stableFor = (candidate?.islandId === island.id ? candidate.stableFor : 0) + dt
        palmCandidates.set(i, { islandId: island.id, stableFor })
        if (!reduced.matches && stableFor < 2) continue
        if (palms.size >= 4 || [...palms.values()].some(p => Math.hypot(p.x - x, p.y - y) < 190)) continue
        palms.set(i, { x, y, islandId: island.id, unsuitable: 0, opacity: reduced.matches ? 1 : 0 })
        palmCandidates.delete(i)
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ring = ripples[i], age = time - ring.born
        if (age > 2) { ripples.splice(i, 1); continue }
        for (let j = 0; j < 3; j++) {
          const t = (age - j * 0.16) / 1.6
          if (t <= 0 || t >= 1) continue
          ctx.strokeStyle = `rgba(223,255,247,${(1 - t) ** 2 * 0.5})`
          ctx.lineWidth = 1
          // Break rings at the coast rather than drawing over islands.
          ctx.beginPath()
          let connected = false
          for (let k = 0; k <= 64; k++) {
            const a = k / 64 * Math.PI * 2
            const x = ring.x + Math.cos(a) * (8 + t * 95), y = ring.y + Math.sin(a) * (8 + t * 95) * 0.65
            if (seaDistance(x, y) < 5) { connected = false; continue }
            if (connected) ctx.lineTo(x, y); else ctx.moveTo(x, y)
            connected = true
          }
          ctx.stroke()
        }
      }
      // A gentle daylight wash keeps the scene airy, including the screen edges.
      const shade = ctx.createLinearGradient(0, 0, 0, height)
      shade.addColorStop(0, 'rgba(255,252,229,0.04)'); shade.addColorStop(0.5, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(27,112,119,0.025)')
      ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height)
    }

    const tick = (now: number) => {
      if (document.hidden) return
      if (!reduced.matches && now - lastFrame < 32) { frame = requestAnimationFrame(tick); return }
      const dt = reduced.matches ? 0 : lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0.033
      lastFrame = now
      time += dt
      if (now - lastSample > 90) { sample(); lastSample = now }
      morph(reduced.matches ? 1 : dt)
      if (dirty && (now - lastTerrain > 80 || reduced.matches)) { buildTerrain(); lastTerrain = now }
      draw(dt)
      if (reduced.matches) timer = setTimeout(() => tick(performance.now()), 250)
      else frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame); clearTimeout(timer)
      lastFrame = 0; lastSample = -1000
      ripples.length = 0; press = null
      if (!document.hidden) tick(performance.now())
    }
    const isBlank = (target: EventTarget | null) => target instanceof Element &&
      !!target.closest('[data-wallpaper-surface]') &&
      !target.closest('a,button,input,textarea,select,[role],[contenteditable],[data-wallpaper-exclude],.folder-pop') &&
      !document.querySelector('[role="dialog"], [role="menu"]')
    const down = (event: PointerEvent) => {
      press = event.button === 0 && isBlank(event.target) ? { x: event.clientX, y: event.clientY, valid: true } : null
    }
    const move = (event: PointerEvent) => {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.valid = false
    }
    const click = (event: MouseEvent) => {
      if (press?.valid && isBlank(event.target) && !dragState.suppressClick && !reduced.matches && seaDistance(event.clientX, event.clientY) > 5) {
        if (ripples.length >= 6) ripples.shift()
        ripples.push({ x: event.clientX, y: event.clientY, born: time })
      }
      press = null
    }
    const cancel = () => { press = null }
    resize(); sync()
    window.addEventListener('resize', resize)
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('click', click)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(frame); clearTimeout(timer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('click', click)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
    }
  }, [])

  return <canvas ref={canvasRef} data-wallpaper-scene="bookmark-islands" className="absolute inset-0 h-full w-full bg-[#4cb5b7]" />
}
