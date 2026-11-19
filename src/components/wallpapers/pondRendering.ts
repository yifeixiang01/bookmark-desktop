const TAU = Math.PI * 2

/** Paint detailed koi once; animation bends the cached image in narrow strips. */
export function createKoiSprite(kind: number, variant: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 280; canvas.height = 144
  const ctx = canvas.getContext('2d')!
  ctx.translate(150, 72)
  const gold = kind === 1, dark = kind === 3, red = kind === 2
  const base = gold ? '#d5b666' : dark ? '#34433d' : red ? '#d77a50' : '#f0efda'
  const finColor = gold ? '#d9b66d' : dark ? '#6c7970' : '#ded9bd'
  const fin = (side: number, rear: boolean) => {
    const x = rear ? -40 : 29, spread = rear ? 22 : 38
    const gradient = ctx.createLinearGradient(x, 0, x - 26, side * spread)
    gradient.addColorStop(0, finColor); gradient.addColorStop(1, 'rgba(204,210,180,.12)')
    ctx.fillStyle = gradient
    ctx.beginPath(); ctx.moveTo(x, side * 12)
    ctx.bezierCurveTo(x - 5, side * 26, x - 24, side * (spread + 9), x - 36, side * spread)
    ctx.quadraticCurveTo(x - 29, side * 20, x - 13, side * 10); ctx.fill()
    ctx.strokeStyle = 'rgba(124,131,104,.35)'; ctx.lineWidth = .6
    for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(x - 5, side * 14); ctx.lineTo(x - 10 - j * 3.7, side * (spread - j * 1.1)); ctx.stroke() }
  }
  for (const side of [-1, 1]) { fin(side, false); fin(side, true) }
  const tailGradient = ctx.createLinearGradient(-105, -24, -105, 24)
  tailGradient.addColorStop(0, 'rgba(218,216,177,.35)'); tailGradient.addColorStop(.45, finColor); tailGradient.addColorStop(1, 'rgba(197,204,169,.28)')
  ctx.fillStyle = tailGradient
  ctx.beginPath(); ctx.moveTo(-68, -5); ctx.bezierCurveTo(-91, -8, -99, -20, -121, -28)
  ctx.bezierCurveTo(-115, -11, -103, -5, -108, 0); ctx.bezierCurveTo(-103, 5, -115, 11, -121, 28)
  ctx.bezierCurveTo(-99, 20, -91, 8, -68, 5); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(116,124,92,.4)'; ctx.lineWidth = .7
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(-73, 0); ctx.quadraticCurveTo(-97, i * 2, -117 + Math.abs(i) * 1.5, i * 6); ctx.stroke() }
  const body = new Path2D('M78 -2 C77 -13 64 -21 43 -25 C8 -30 -22 -23 -47 -12 Q-64 -5 -80 -4 L-80 4 Q-64 5 -47 12 C-22 23 8 30 43 25 C64 21 77 13 78 2 Q81 0 78 -2Z')
  ctx.fillStyle = base; ctx.fill(body)
  ctx.save(); ctx.clip(body)
  if (kind === 0 || kind === 4) {
    // Irregular saddle markings, with distinct placement on each fish.
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.translate(49 - k * 34 + Math.sin(variant * 7 + k) * 9, Math.cos(k * 3 + variant) * 7)
      ctx.fillStyle = kind === 4 && k % 2 ? '#283930' : '#b74929'
      const points = Array.from({ length: 12 }, (_, j) => {
        const a = j / 12 * TAU, r = 15 + Math.sin(j * 4.3 + variant + k) * 4
        return { x: Math.cos(a) * r, y: Math.sin(a) * r * 1.2 }
      })
      ctx.beginPath(); ctx.moveTo((points[11].x + points[0].x) / 2, (points[11].y + points[0].y) / 2)
      points.forEach((p, j) => { const n = points[(j + 1) % 12]; ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2) })
      ctx.closePath(); ctx.fill(); ctx.restore()
    }
  }
  // Small overlapping scales follow the body, instead of oversized graphic spots.
  ctx.lineWidth = .55
  for (let row = -5; row <= 5; row++) for (let col = 0; col < 22; col++) {
    const x = -70 + col * 6 + (row % 2 ? 3 : 0), y = row * 4.7
    ctx.strokeStyle = dark ? 'rgba(207,215,181,.13)' : 'rgba(89,78,48,.08)'
    ctx.beginPath(); ctx.ellipse(x, y, 4.1, 3.1, 0, -.9, .9); ctx.stroke()
  }
  const shade = ctx.createLinearGradient(0, -28, 0, 28)
  shade.addColorStop(0, 'rgba(25,37,28,.3)'); shade.addColorStop(.25, 'rgba(58,63,36,.05)'); shade.addColorStop(.45, 'rgba(255,248,216,.3)'); shade.addColorStop(.7, 'rgba(52,54,33,.1)'); shade.addColorStop(1, 'rgba(25,36,27,.27)')
  ctx.fillStyle = shade; ctx.fillRect(-90, -30, 175, 60)
  const head = ctx.createRadialGradient(62, -5, 0, 62, 0, 20)
  head.addColorStop(0, 'rgba(244,239,210,.23)'); head.addColorStop(1, 'rgba(244,239,210,0)')
  ctx.fillStyle = head; ctx.fillRect(42, -24, 40, 48)
  ctx.restore()
  ctx.strokeStyle = 'rgba(55,62,42,.38)'; ctx.lineWidth = 1
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(46, side * 20); ctx.quadraticCurveTo(37, side * 12, 43, side * 4); ctx.stroke()
    ctx.fillStyle = '#a7a37a'; ctx.beginPath(); ctx.ellipse(66, side * 12, 3.3, 2.1, side * .2, 0, TAU); ctx.fill()
    ctx.fillStyle = '#14251e'; ctx.beginPath(); ctx.ellipse(67, side * 12, 1.9, 1.4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,237,.7)'; ctx.fillRect(67, side * 12 - .7, .8, .8)
  }
  ctx.strokeStyle = 'rgba(66,66,43,.5)'; ctx.beginPath(); ctx.moveTo(77, -3); ctx.quadraticCurveTo(73, 0, 77, 3); ctx.stroke()
  return canvas
}

