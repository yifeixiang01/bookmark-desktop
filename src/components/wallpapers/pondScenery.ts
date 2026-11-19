import { seaNoise } from './seaTexture'

const TAU = Math.PI * 2
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number) => Math.max(0, Math.min(1, v))
function randomSource(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
}

/** A softly granulated, painted pond bed. Open water remains the main subject. */
export function paintPondBed(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.min(1050, Math.round(width))
  canvas.height = Math.round(height * canvas.width / width)
  const ctx = canvas.getContext('2d', { alpha: false })!
  const pixels = ctx.createImageData(canvas.width, canvas.height)
  const random = randomSource(318)
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const u = x / canvas.width, v = y / canvas.height
    const px = u * 1440, py = v * 900
    const cloud = seaNoise(px * .003 + 13, py * .003 + 32)
    const detail = seaNoise(px * .019 + 52, py * .019)
    const edge = clamp((Math.abs(u - .5) - .22) * 2.6) + clamp((Math.abs(v - .5) - .29) * 1.9)
    const reef = seaNoise(px * .006 + 82, py * .006 + 19)
    const islands = clamp((reef + detail * .14 - .54 + edge * .12) * 15)
    const stone = clamp((detail - .38) * 3)
    const sand = clamp((cloud - .42) * 2.5 + edge * .55)
    const depth = [77, 135, 126], shallow = [133, 164, 126], rock = [55 + stone * 15, 98 + stone * 14, 98 + stone * 11]
    const grain = (random() - .5) * 6
    const wash = Math.sin(px * .09 + py * .17) * .7
    const i = (y * canvas.width + x) * 4
    for (let c = 0; c < 3; c++) pixels.data[i + c] = mix(mix(depth[c], shallow[c], sand), rock[c], islands * .82) + grain + wash
    pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  ctx.save(); ctx.scale(canvas.width / 1440, canvas.height / 900)
  // Irregular stones sit in scattered edge clusters; the middle stays quiet.
  for (let i = 0; i < 220; i++) {
    let x = random() * 1440, y = random() * 900
    if (x > 175 && x < 1265 && y > 110 && y < 800) continue
    x += Math.sin(y * .015) * 30
    const r = 3 + random() ** 2 * 16
    ctx.save(); ctx.translate(x, y); ctx.rotate(random() * TAU); ctx.scale(1, .6 + random() * .3)
    const shape = new Path2D()
    for (let j = 0; j <= 9; j++) {
      const a = j % 9 / 9 * TAU, radius = r * (.86 + .14 * Math.sin(j % 9 * 13.5 + i))
      if (!j) shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
      else shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
    }
    shape.closePath()
    ctx.fillStyle = 'rgba(27,71,65,.3)'; ctx.translate(1, 2); ctx.fill(shape); ctx.translate(-1, -2)
    ctx.fillStyle = ['#577f73', '#739581', '#668a7c', '#3d6b69', '#8ca087'][i % 5]; ctx.fill(shape)
    ctx.strokeStyle = 'rgba(180,197,153,.3)'; ctx.lineWidth = 1; ctx.stroke(shape)
    ctx.fillStyle = 'rgba(181,194,154,.18)'
    ctx.beginPath(); ctx.ellipse(-r * .2, -r * .25, r * .5, r * .25, -.4, 0, TAU); ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** Cached botanical painting: scalloped leaves, fine veins and layered pink petals. */
export function createLotus(radius: number, flower: boolean, seed: number) {
  const canvas = document.createElement('canvas')
  const size = Math.ceil(radius * 2.8)
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const random = randomSource(seed)
  ctx.translate(size / 2, size / 2)
  const leaf = new Path2D()
  leaf.moveTo(-radius * .12, radius * .04)
  for (let j = 0; j <= 180; j++) {
    const a = .24 + j / 180 * (TAU - .45)
    const r = radius * (1 + Math.sin(a * 11 + seed) * .035 + Math.sin(a * 19) * .012)
    leaf.lineTo(Math.cos(a) * r, Math.sin(a) * r * .91)
  }
  leaf.closePath()
  ctx.save(); ctx.translate(4, 8); ctx.fillStyle = 'rgba(17,60,50,.28)'; ctx.filter = 'blur(3px)'; ctx.fill(leaf); ctx.restore()
  const base = ctx.createRadialGradient(-radius * .2, -radius * .2, 2, 0, 0, radius)
  base.addColorStop(0, '#899c53'); base.addColorStop(.47, '#718a49'); base.addColorStop(.84, '#3d6850'); base.addColorStop(1, '#748854')
  ctx.fillStyle = base; ctx.fill(leaf)
  ctx.save(); ctx.clip(leaf)
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU
    const tipX = Math.cos(a) * radius, tipY = Math.sin(a) * radius * .92
    ctx.fillStyle = i % 3 ? 'rgba(197,194,101,.15)' : 'rgba(23,64,50,.27)'
    ctx.beginPath(); ctx.moveTo(-radius * .12, 0)
    ctx.quadraticCurveTo(tipX * .5 - 8, tipY * .5 + 6, tipX, tipY)
    ctx.lineTo(Math.cos(a + .14) * radius, Math.sin(a + .14) * radius * .92); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(219,219,150,.46)'; ctx.lineWidth = .85
    ctx.beginPath(); ctx.moveTo(-radius * .12, 0); ctx.quadraticCurveTo(tipX * .5 - 5, tipY * .5, tipX, tipY); ctx.stroke()
    for (let j = 1; j < 5; j++) {
      const t = j / 5
      ctx.strokeStyle = 'rgba(195,206,151,.18)'; ctx.lineWidth = .55
      ctx.beginPath(); ctx.moveTo(tipX * t - radius * .12 * (1 - t), tipY * t)
      ctx.quadraticCurveTo(tipX * t + 4, tipY * t + 4, Math.cos(a + .13) * radius * (t + .12), Math.sin(a + .13) * radius * .92 * (t + .12)); ctx.stroke()
    }
  }
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(222,223,164,.09)' : 'rgba(27,69,48,.08)'
    ctx.fillRect((random() * 2 - 1) * radius, (random() * 2 - 1) * radius, 1 + random() * 3, .8)
  }
  ctx.restore(); ctx.strokeStyle = 'rgba(204,205,134,.45)'; ctx.lineWidth = 1; ctx.stroke(leaf)
  if (flower) {
    ctx.translate(-radius * .02, -radius * .06)
    ctx.save(); ctx.translate(2, 4); ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(27,48,34,.3)'
    ctx.beginPath(); ctx.arc(0, 0, radius * .4, 0, TAU); ctx.fill(); ctx.restore()
    // Broad, cupped outer petals and upright inner petals vary in length,
    // overlap and angle. Avoid the identical radial shapes of a rosette icon.
    ctx.rotate(seed * .23)
    for (let ring = 0; ring < 4; ring++) {
      const count = [9, 8, 7, 5][ring]
      const ringLength = radius * [.51, .42, .31, .22][ring]
      for (let i = 0; i < count; i++) {
        ctx.save()
        const angle = i / count * TAU + ring * .39 + (random() - .5) * .17
        ctx.rotate(angle)
        const length = ringLength * (.87 + random() * .23)
        const width = length * (.3 + random() * .12)
        const curl = (random() - .5) * length * .23
        ctx.translate(0, -radius * (.035 + ring * .008))
        const petal = new Path2D()
        petal.moveTo(-width * .14, 4)
        petal.bezierCurveTo(-width * 1.12, -length * .3, -width * .95, -length * .68, curl, -length)
        petal.bezierCurveTo(width * .9, -length * .76, width * 1.05, -length * .27, width * .12, 4)
        petal.closePath()
        ctx.shadowColor = 'rgba(84,38,47,.24)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1.4
        const color = ctx.createLinearGradient(-width, 0, width * .5, -length)
        color.addColorStop(0, '#a9526c'); color.addColorStop(.3, '#d48b9b')
        color.addColorStop(.58, '#f2c4c8'); color.addColorStop(.85, '#f9e2d9'); color.addColorStop(1, '#d8849b')
        ctx.fillStyle = color; ctx.fill(petal)
        ctx.shadowColor = 'transparent'
        ctx.save(); ctx.clip(petal)
        const fold = ctx.createLinearGradient(-width, 0, width, 0)
        fold.addColorStop(0, 'rgba(126,49,75,.24)'); fold.addColorStop(.42, 'rgba(255,246,231,.22)'); fold.addColorStop(.67, 'rgba(255,246,231,0)'); fold.addColorStop(1, 'rgba(143,65,83,.2)')
        ctx.fillStyle = fold; ctx.fillRect(-width * 1.3, -length * 1.1, width * 2.6, length * 1.3)
        for (let vein = -2; vein <= 2; vein++) {
          ctx.strokeStyle = 'rgba(165,83,108,.13)'; ctx.lineWidth = .4
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(vein * width * .27, -length * .5, curl + vein * width * .15, -length * .94); ctx.stroke()
        }
        ctx.restore(); ctx.restore()
      }
    }
    ctx.fillStyle = '#dbc06d'; ctx.beginPath(); ctx.arc(0, 0, radius * .075, 0, TAU); ctx.fill()
    for (let i = 0; i < 32; i++) {
      const a = random() * TAU, r = random() * radius * .085
      ctx.fillStyle = i % 2 ? '#f9df96' : '#aa853f'; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1, 0, TAU); ctx.fill()
    }
  }
  return canvas
}
