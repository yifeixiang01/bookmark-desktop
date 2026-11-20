import { useEffect, useRef } from 'react'
import { anchorDistance, smoothUnion } from './islandGeometry'
import { seaNoise } from './seaTexture'
import { wallpaperPixelRatio } from './renderBudget'

type Cloud = { id: string; x: number; y: number; rx: number; ry: number; life: number; seed: number; fade?: number; dissolveX?: number; dissolveY?: number }
const hash = (text: string) => Array.from(text).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0, 17) >>> 0
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }

/** Grass below, clouds above: only settled bookmarks and folders seed clouds. */
export function MeadowWallpaper() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const grass = document.createElement('canvas')
    const g = grass.getContext('2d')!
    const cloudLayer = document.createElement('canvas')
    const c = cloudLayer.getContext('2d')!
    const raster = document.createElement('canvas')
    const rasterCtx = raster.getContext('2d')!
    const shadow = document.createElement('canvas')
    const shadowCtx = shadow.getContext('2d')!
    let cloudPixels: ImageData
    let distances: Float32Array
    let opacityLimits: Float32Array
    let cloudStep = 3
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0, height = 0, time = 0, previous = 0, sampled = -1000, painted = -1000
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined
    let clouds: Cloud[] = [], targets: Cloud[] = []
    let initialized = false, serial = 0, dirty = true
    const birdRouteSeed = Math.random() * 100000

    const sample = () => {
      const found: Cloud[] = []
      for (const el of document.querySelectorAll<HTMLElement>('[data-wallpaper-surface] [data-wallpaper-anchor]')) {
        const id = el.dataset.wallpaperAnchor!
        if (el.dataset.wallpaperDragging) {
          const old = clouds.find(cloud => cloud.id === id)
          if (old) old.id = `retiring-${serial++}`
          continue
        }
        const rect = el.getBoundingClientRect()
        const clip = el.closest('.snap-mandatory')?.getBoundingClientRect()
        if (!rect.width || !rect.height || rect.right < 0 || rect.left > width || rect.bottom < 0 || rect.top > height) continue
        if (clip && (rect.right < clip.left + 10 || rect.left > clip.right - 10 || rect.bottom < clip.top || rect.top > clip.bottom)) continue
        found.push({ id, x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.43,
          rx: rect.width * 0.5 + 20, ry: rect.height * 0.44 + 22, life: 1, seed: hash(id) })
      }
      targets = found
      if (!initialized || reduced.matches) { clouds = found.map(cloud => ({ ...cloud })); dirty = true }
      initialized = true
    }

    const resize = () => {
      width = innerWidth; height = innerHeight
      const ratio = wallpaperPixelRatio(width, height)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const grassStep = Math.max(1.5, width / 1280, height / 800)
      grass.width = Math.ceil(width / grassStep); grass.height = Math.ceil(height / grassStep)
      const pixels = g.createImageData(grass.width, grass.height)
      for (let y = 0; y < grass.height; y++) for (let x = 0; x < grass.width; x++) {
        const tone = seaNoise(x * 0.009 + 7, y * 0.009 + 3) - 0.5
        const detail = seaNoise(x * 0.065, y * 0.065) - 0.5
        const meadow = seaNoise(x * 0.024 + 21, y * 0.024 + 17) - 0.5
        const index = (y * grass.width + x) * 4
        pixels.data[index] = 143 + tone * 86 + detail * 22 + meadow * 28
        pixels.data[index + 1] = 174 + tone * 68 + detail * 18 + meadow * 18
        pixels.data[index + 2] = 86 + tone * 55 + detail * 15 + meadow * 20
        pixels.data[index + 3] = 255
      }
      g.putImageData(pixels, 0, 0)
      // Short, multidirectional tufts seen from above; no horizon or tall side-on blades.
      g.lineWidth = 0.45
      for (let i = 0; i < Math.min(60000, width * height / 38); i++) {
        const x = random(i + 7) * grass.width, y = random(i + 71) * grass.height
        const patch = seaNoise(x * 0.025, y * 0.025)
        if (random(i + 13) > patch + 0.1) continue
        const angle = random(i + 43) * Math.PI * 2
        const length = 0.8 + random(i + 91) * 1.4
        g.strokeStyle = i % 3 ? 'rgba(47,87,35,0.27)' : 'rgba(226,231,157,0.38)'
        g.beginPath()
        for (let j = 0; j < 3; j++) {
          const a = angle + j * 1.8
          g.moveTo(x, y); g.lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length)
        }
        g.stroke()
        if (i % 131 === 0) {
          g.fillStyle = i % 2 ? 'rgba(246,239,186,0.7)' : 'rgba(245,245,220,0.65)'
          g.beginPath(); g.arc(x + 2, y, 0.75, 0, Math.PI * 2); g.fill()
        }
      }
      cloudLayer.width = Math.ceil(width); cloudLayer.height = Math.ceil(height)
      cloudStep = Math.max(3, width / 480, height / 300)
      raster.width = shadow.width = Math.ceil(width / cloudStep)
      raster.height = shadow.height = Math.ceil(height / cloudStep)
      cloudPixels = rasterCtx.createImageData(raster.width, raster.height)
      distances = new Float32Array(raster.width * raster.height)
      opacityLimits = new Float32Array(raster.width * raster.height)
      sample(); dirty = true
    }

    const morph = (dt: number) => {
      const amount = reduced.matches ? 1 : 1 - Math.exp(-dt * 1.15)
      const ids = new Set(targets.map(cloud => cloud.id))
      for (const target of targets) {
        let cloud = clouds.find(old => old.id === target.id)
        if (!cloud) { cloud = { ...target, life: 0 }; clouds.push(cloud) }
        for (const key of ['x', 'y', 'rx', 'ry', 'life'] as const) {
          const difference = target[key] - cloud[key]
          if (Math.abs(difference) > 0.002) { cloud[key] += difference * amount; dirty = true }
          else cloud[key] = target[key]
        }
      }
      clouds = clouds.filter(cloud => {
        if (ids.has(cloud.id)) return true
        if (reduced.matches) return false
        if (cloud.dissolveX === undefined) {
          const nearby = clouds
            .filter(other => ids.has(other.id))
            .sort((a, b) => Math.hypot(a.x - cloud.x, a.y - cloud.y) - Math.hypot(b.x - cloud.x, b.y - cloud.y))[0]
          if (nearby) {
            const distance = Math.hypot(nearby.x - cloud.x, nearby.y - cloud.y) || 1
            cloud.dissolveX = (nearby.x - cloud.x) / distance
            cloud.dissolveY = (nearby.y - cloud.y) / distance
          } else { cloud.dissolveX = 0; cloud.dissolveY = 0 }
        }
        // Continue reducing the mass throughout the retreat. Only after the
        // cloud is small do gaps start to open between its remaining wisps.
        const thinning = 1 - (cloud.fade ?? 1)
        const shrinkRate = 0.72 + thinning * thinning * (3 - 2 * thinning) * 0.63
        cloud.life = Math.max(0, cloud.life * Math.exp(-dt * shrinkRate))
        // Tie visibility to the remaining size. The cloud cannot become
        // invisible while its silhouette is still large.
        // Delay transparency until the cloud has physically shrunk to a
        // small remnant, especially noticeable around large desktop cards.
        const remainingRadius = Math.max(cloud.rx, cloud.ry) * Math.sqrt(cloud.life)
        cloud.fade = Math.min(1, remainingRadius / 20)
        dirty = true
        return cloud.life > 0.0001
      })
    }

    const renderClouds = () => {
      const step = cloudStep
      const cols = raster.width, rows = raster.height
      const pixels = cloudPixels
      pixels.data.fill(0)
      const masses = [...clouds,
        { id: 'free-a', x: width * 0.44, y: height * 0.84, rx: 49, ry: 24, life: 1, seed: 135 },
        { id: 'free-b', x: width * 0.82, y: height * 0.18, rx: 42, ry: 27, life: 1, seed: 371 },
      ]
      distances.fill(1000)
      opacityLimits.fill(0)
      for (const cloud of masses) {
        const scale = Math.sqrt(cloud.life)
        if (scale <= 0) continue
        const anchor = { ...cloud, rx: cloud.rx * scale, ry: cloud.ry * scale }
        const retreating = cloud.dissolveX !== undefined
        const organic = retreating ? Math.min(1, (1 - scale) * 2) : 0
        const left = Math.max(0, Math.floor((cloud.x - anchor.rx - 35) / step))
        const right = Math.min(cols - 1, Math.ceil((cloud.x + anchor.rx + 35) / step))
        const top = Math.max(0, Math.floor((cloud.y - anchor.ry - 35) / step))
        const bottom = Math.min(rows - 1, Math.ceil((cloud.y + anchor.ry + 35) / step))
        for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
          const x = col * step, y = row * step, index = row * cols + col
          // Overlapping, irregular billows with fine wisps instead of outlined circles.
          const billow = seaNoise(x * 0.033 + cloud.seed % 59, y * 0.033) - 0.5
          const fine = seaNoise(x * 0.095, y * 0.095) - 0.5
          // Scale the soft edge too, so a tiny cloud cannot leave a full-size wisp.
          const nx = (x - cloud.x) / Math.max(0.001, anchor.rx)
          const ny = (y - cloud.y) / Math.max(0.001, anchor.ry)
          const ovalDistance = (Math.hypot(nx, ny) - 1) * Math.min(cloud.rx, cloud.ry)
          const shapeDistance = anchorDistance(x, y, anchor) / scale
          const distance = shapeDistance * (1 - organic) + ovalDistance * organic + billow * (30 + organic * 14) + fine * 7
          let coverage = 1
          if (cloud.fade !== undefined && cloud.fade < 1) {
            const dx = (x - cloud.x) / Math.max(1, cloud.rx * scale)
            const dy = (y - cloud.y) / Math.max(1, cloud.ry * scale)
            const towardNeighbor = Math.max(0, dx * (cloud.dissolveX ?? 0) + dy * (cloud.dissolveY ?? 0))
            const seed = cloud.seed % 59
            // Stretch and warp the texture into wisps throughout the mass.
            // No radial mask: the center must not turn into a circular hole.
            const sparse = 1 - cloud.fade
            const warp = seaNoise(x * 0.045 + seed, y * 0.045 + 7) * 2
            const strands = seaNoise(x * 0.055 + seed, y * 0.24 + warp)
            const detail = seaNoise(x * 0.12 + seed * 0.41, y * 0.36 + warp)
            const density = strands * 0.75 + detail * 0.25
            const erosion = sparse * (1.18 + towardNeighbor * 0.12) - 0.22
            const edge = Math.max(0, Math.min(1, (density - erosion) / 0.32))
            const wisps = edge * edge * (3 - 2 * edge)
            // Blend into the strand pattern gradually so the first gaps do
            // not appear as a sudden texture change.
            coverage = (1 - sparse) + sparse * wisps
          }
          if (coverage === 0) continue
          distances[index] = smoothUnion(distances[index], distance, 30)
          if (distance < 10) opacityLimits[index] = Math.max(opacityLimits[index], coverage)
        }
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const index = row * cols + col, d = distances[index]
        if (d > 10) continue
        const x = col * step, y = row * step
        const texture = seaNoise(x * 0.037, y * 0.037)
        const fine = seaNoise(x * 0.11 + 11, y * 0.11)
        const volume = Math.min(1, Math.max(0, -d / 26))
        let verticalLight = 0
        for (const cloud of masses) {
          const nx = (x - cloud.x) / Math.max(1, cloud.rx * Math.sqrt(cloud.life))
          const ny = (y - cloud.y) / Math.max(1, cloud.ry * Math.sqrt(cloud.life))
          if (nx * nx + ny * ny < 1) verticalLight = Math.max(verticalLight, -ny)
        }
        const light = 224 + volume * 23 + verticalLight * 6 + (texture - 0.5) * 15 + (fine - 0.5) * 3
        pixels.data[index * 4] = light - Math.max(0, -verticalLight) * 2
        pixels.data[index * 4 + 1] = light + 1
        pixels.data[index * 4 + 2] = Math.min(255, light + 7 + Math.max(0, -verticalLight) * 5)
        const opacity = Math.max(0, Math.min(1, (8 - d) / 9))
        pixels.data[index * 4 + 3] = opacity * opacity * (3 - 2 * opacity) * opacityLimits[index] * 255
      }
      rasterCtx.putImageData(pixels, 0, 0)
      c.clearRect(0, 0, width, height)
      shadowCtx.globalCompositeOperation = 'source-over'
      shadowCtx.clearRect(0, 0, cols, rows)
      shadowCtx.drawImage(raster, 0, 0)
      shadowCtx.globalCompositeOperation = 'source-in'
      shadowCtx.fillStyle = '#324b27'; shadowCtx.fillRect(0, 0, cols, rows)
      c.save(); c.filter = 'blur(9px)'; c.globalAlpha = 0.35
      c.drawImage(shadow, 32, 44, width, height); c.restore()
      c.drawImage(raster, 0, 0, width, height)
      dirty = false
    }

    const girlAndKite = () => {
      const x = width * 0.66 + Math.sin(time * 0.065) * 13
      const y = height * 0.66 + Math.sin(time * 0.045 + 1) * 10
      const kx = x + 61 + Math.sin(time * 0.32) * 12, ky = y - 85 + Math.cos(time * 0.27) * 9
      // String rises above the grass, swaying gently in the breeze.
      ctx.strokeStyle = 'rgba(79,98,65,0.48)'; ctx.lineWidth = 0.7
      ctx.beginPath(); ctx.moveTo(x + 3, y - 2); ctx.quadraticCurveTo(kx - 30, y - 21, kx, ky); ctx.stroke()
      ctx.save(); ctx.translate(x, y)
      ctx.fillStyle = 'rgba(55,83,40,0.2)'; ctx.beginPath(); ctx.ellipse(5, 8, 4, 9, -0.5, 0, Math.PI * 2); ctx.fill()
      const step = Math.sin(time * 1.3) * 1.1
      ctx.strokeStyle = '#705c4c'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(-1, 3); ctx.lineTo(-2 + step, 7); ctx.moveTo(2, 3); ctx.lineTo(3 - step, 7); ctx.stroke()
      ctx.fillStyle = '#d88876'; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-5, 4); ctx.quadraticCurveTo(0, 6, 5, 3); ctx.lineTo(2, -3); ctx.fill()
      ctx.strokeStyle = '#d6b38a'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(5, -4); ctx.lineTo(6, -6); ctx.moveTo(-2, -1); ctx.lineTo(-5, 1); ctx.stroke()
      ctx.fillStyle = '#493f31'; ctx.beginPath(); ctx.ellipse(0, -4, 3.5, 3.1, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(-3, -2, 2.6, 1.4, -0.7, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(0.24 + Math.sin(time * 0.28) * 0.1)
      ctx.fillStyle = 'rgba(55,83,40,0.13)'; ctx.beginPath(); ctx.moveTo(18, 28); ctx.lineTo(26, 35); ctx.lineTo(20, 46); ctx.lineTo(12, 36); ctx.closePath(); ctx.fill()
      const colors = ['#e7aa78', '#da8478', '#789d9a', '#e9d492']
      const points = [[0, -12], [8, -1], [0, 13], [-8, -1]]
      for (let i = 0; i < 4; i++) { ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(...points[i] as [number, number]); ctx.lineTo(...points[(i + 1) % 4] as [number, number]); ctx.closePath(); ctx.fill() }
      ctx.strokeStyle = '#9d8b69'; ctx.lineWidth = 0.55
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 13); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.stroke()
      ctx.strokeStyle = '#c68e78'; ctx.lineWidth = 0.85
      ctx.beginPath(); ctx.moveTo(0, 13); ctx.bezierCurveTo(8, 20, -7, 25, Math.sin(time * 0.7) * 6, 35); ctx.stroke()
      ctx.restore()
    }

    const birds = () => {
      // Slow passages separated by quiet intervals.
      if (reduced.matches) return
      const interval = 196
      const cycle = Math.floor(time / interval)
      // Extend both ends beyond the viewport, including diagonal approaches.
      const reach = Math.hypot(width, height) * 0.65 + 100
      const count = 1 + Math.floor(random(birdRouteSeed + cycle * 23 + 3) * 3)
      const flockSeed = birdRouteSeed + cycle * 101
      const together = count > 1 && random(flockSeed + 8) < 0.5
      const spacing = 30 + random(flockSeed + 9) * 30
      for (let i = 0; i < count; i++) {
        // Companions share one trajectory; solitary birds choose their own timing and route.
        const seed = together ? flockSeed : flockSeed + i * 29
        const duration = together ? 120 : 105 + random(seed + 10) * 45
        const elapsed = time % interval - (together ? 10 : 10 + random(seed + 11) * 12)
        if (elapsed < 0 || elapsed > duration) continue
        const progress = elapsed / duration
        const heading = random(seed + 12) * Math.PI * 2
        const dx = Math.cos(heading), dy = Math.sin(heading)
        const centerX = width * (0.3 + random(seed + 13) * 0.4)
        const centerY = height * (0.3 + random(seed + 14) * 0.4)
        const phase = random(seed + 4) * Math.PI * 2
        const drift = 5 + random(seed + 5) * 7
        const slot = i - (count - 1) / 2
        const offsetAlong = together ? slot * spacing * 0.65 : 0
        const offsetAcross = together ? slot * spacing : (random(seed + 7) - 0.5) * 100
        const along = (progress * 2 - 1) * reach + offsetAlong
        const across = Math.sin(progress * Math.PI * 1.5) * 28 + offsetAcross
          + Math.sin(progress * Math.PI * 2 + phase) * drift
        const x = centerX + dx * along - dy * across
        const y = centerY + dy * along + dx * across
        const curve = Math.cos(progress * Math.PI * 1.5) * 28 * Math.PI * 1.5
          + Math.cos(progress * Math.PI * 2 + phase) * drift * Math.PI * 2
        const angle = Math.atan2(dy * reach * 2 + dx * curve, dx * reach * 2 - dy * curve)
        // Short bouts of wingbeats alternate with long, quiet glides.
        const beat = (time + i * 1.7) % 8 < 2 ? Math.sin(time * 4.5 + i * 1.7) : 0.3
        const span = 4.2 + beat * 1.1
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
        ctx.globalAlpha = 0.78
        ctx.fillStyle = '#4b5550'
        // Tapered swept wings attach at the shoulders, either side of the body.
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(1, side * 0.5)
          ctx.bezierCurveTo(2.2, side * 2, 0.3, side * (span - 0.7), -1.8 - beat * 0.5, side * span)
          ctx.lineTo(-1, side * (span * 0.58))
          ctx.quadraticCurveTo(-0.5, side * 1.8, -1.3, side * 0.7); ctx.closePath(); ctx.fill()
        }
        ctx.fillStyle = '#3e4945'
        ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 0.85, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(2, 0, 0.8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.moveTo(2.5, -0.35); ctx.lineTo(3.5, 0); ctx.lineTo(2.5, 0.35); ctx.fill()
        ctx.beginPath(); ctx.moveTo(-1.5, 0); ctx.lineTo(-3.8, -1.1); ctx.lineTo(-3.2, 0); ctx.lineTo(-3.8, 1.1); ctx.closePath(); ctx.fill()
        ctx.restore()
      }
    }

    const draw = () => {
      ctx.drawImage(grass, 0, 0, width, height)
      girlAndKite()
      birds()
      ctx.drawImage(cloudLayer, 0, 0)
    }
    const tick = (now: number) => {
      if (document.hidden) return
      if (!reduced.matches && now - previous < 32) { frame = requestAnimationFrame(tick); return }
      const dt = reduced.matches ? 0 : previous ? Math.min((now - previous) / 1000, 0.08) : 0.033
      previous = now; time += dt
      if (now - sampled > 100) { sample(); sampled = now }
      morph(reduced.matches ? 1 : dt)
      if (dirty && (now - painted > 65 || reduced.matches)) { renderClouds(); painted = now }
      draw()
      if (reduced.matches) timer = setTimeout(() => tick(performance.now()), 250)
      else frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame); clearTimeout(timer); previous = 0; sampled = -1000
      if (!document.hidden) tick(performance.now())
    }
    resize(); sync()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(frame); clearTimeout(timer)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
    }
  }, [])
  return <canvas ref={ref} data-wallpaper-scene="kite-meadow" className="absolute inset-0 h-full w-full bg-[#abc273]" />
}
