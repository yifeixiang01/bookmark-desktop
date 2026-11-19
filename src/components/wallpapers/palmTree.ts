/** Small coconut crowns viewed straight down. (x, y) is the root on the sand. */
export function drawPalmTree(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, time: number) {
  const random = (n: number) => { const v = Math.sin(seed * 17.31 + n * 71.17) * 43758.5453; return v - Math.floor(v) }
  const size = 0.64 + random(1) * 0.13
  const rotation = random(2) * Math.PI * 2
  const count = 9 + Math.floor(random(3) * 3)
  const fronds = Array.from({ length: count }, (_, i) => ({
    angle: rotation + i * Math.PI * 2 / count + (random(10 + i) - 0.5) * 0.27,
    length: 20 + random(30 + i) * 11,
    bend: (random(50 + i) - 0.5) * 8,
    width: 3.8 + random(70 + i) * 1.6,
  }))
  const rootX = 6 + random(90) * 6
  const rootY = 34 + random(91) * 5
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size)
  // Plant the trunk base at the tested land position, not the canopy center.
  // Fronds remain unrestricted so they can overhang the shoreline naturally.
  ctx.translate(-rootX, -rootY)
  const canopy = (shadow: boolean) => {
    fronds.forEach((frond, i) => {
      ctx.save()
      ctx.rotate(frond.angle + Math.sin(time * 0.42 + seed + i * 0.8) * 0.012)
      const { length, bend, width } = frond
      // Slightly curved ribs avoid the uniform spiral of a pinwheel.
      const point = (t: number) => ({ x: length * t, y: bend * t * t })
      ctx.fillStyle = shadow ? '#53664a' : (i % 3 === 0 ? '#708859' : '#5c7c50')
      ctx.beginPath(); ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(length * 0.42, bend * 0.2 - width * 0.55, length, bend)
      ctx.quadraticCurveTo(length * 0.42, bend * 0.2 + width * 0.55, 0, 0); ctx.fill()
      // Tapered paired leaflets form a feathered silhouette at desktop scale.
      for (let j = 1; j <= 10; j++) {
        const t = j / 12, p = point(t)
        const spread = Math.sin(Math.PI * t) ** 0.85 * width
        for (const side of [-1, 1]) {
          ctx.fillStyle = shadow ? '#53664a' : side < 0 ? ['#537348', '#5b794c', '#688254'][i % 3] : ['#8c9d67', '#7f945e', '#90a16c'][i % 3]
          ctx.beginPath(); ctx.moveTo(p.x - 1, p.y)
          ctx.quadraticCurveTo(p.x + 0.8, p.y + side * spread * 0.7, p.x + 4.2, p.y + side * spread)
          ctx.quadraticCurveTo(p.x + 2.4, p.y + side * spread * 0.3, p.x + 1, p.y)
          ctx.fill()
        }
      }
      if (!shadow) {
        ctx.strokeStyle = 'rgba(187,194,133,0.6)'; ctx.lineWidth = 0.6
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(length / 2, 0, length, bend); ctx.stroke()
      }
      ctx.restore()
    })
  }
  // A leaning trunk projects beyond the canopy while the crown stays overhead.
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#9c8b69'; ctx.lineWidth = 3.1
  ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.quadraticCurveTo(rootX - 17, 19, 0, 0); ctx.stroke()
  ctx.strokeStyle = '#d1c19a'; ctx.lineWidth = 1.1
  ctx.beginPath(); ctx.moveTo(rootX - 0.8, rootY - 1); ctx.quadraticCurveTo(rootX - 17.8, 19, -0.8, 0); ctx.stroke()
  ctx.save(); ctx.translate(9, 12); ctx.globalAlpha *= 0.09
  canopy(true); ctx.restore()
  canopy(false)
  const center = ctx.createRadialGradient(-1, -1, 0, 0, 0, 5)
  center.addColorStop(0, '#a2ad73'); center.addColorStop(0.45, '#7d925c'); center.addColorStop(1, 'rgba(89,118,73,0)')
  ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
