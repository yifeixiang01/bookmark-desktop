export interface SeaTraveler {
  x: number; y: number; angle: number; speed: number; phase: number; kind: 'boat' | 'turtle'; ready: boolean
}

/** A small, continuous sweep around a fixed-length oar pivot. */
export function rowingCycle(time: number, phase: number) {
  return { angle: Math.sin(time * 0.55 + phase) * 0.1 }
}

export function advanceTraveler(body: SeaTraveler, dt: number, time: number, width: number, height: number, distance: (x: number, y: number) => number) {
  const margin = body.kind === 'boat' ? 48 : 32
  if (!body.ready) {
    for (let i = 0; i < 80; i++) {
      const x = width * (0.12 + ((i * 0.618 + body.phase * 0.17) % 0.76))
      const y = height * (0.12 + ((i * 0.381 + body.phase * 0.23) % 0.76))
      if (distance(x, y) > margin + 45) { body.x = x; body.y = y; body.ready = true; break }
    }
  }
  if (body.kind === 'boat') {
    const wantedSpeed = 4.5 * (1 + Math.sin(time * 0.055 + body.phase) * 0.18)
    body.speed += (wantedSpeed - body.speed) * (1 - Math.exp(-dt * 0.25))
  } else {
    const wantedSpeed = 4 * (1 + Math.sin(time * 0.055 + body.phase) * 0.35)
    body.speed += (wantedSpeed - body.speed) * (1 - Math.exp(-dt * 0.18))
  }
  const ahead = 70
  const clearance = (a: number) => {
    const x = body.x + Math.cos(a) * ahead, y = body.y + Math.sin(a) * ahead
    return Math.min(distance(x, y) - margin, x - 25, width - 25 - x, y - 25, height - 25 - y)
  }
  let turn = Math.sin(time * 0.037 + body.phase) * 0.035
  if (clearance(body.angle) < 35) turn += clearance(body.angle + 0.7) > clearance(body.angle - 0.7) ? 0.35 : -0.35
  body.angle += turn * dt * (body.kind === 'boat' ? Math.min(1, body.speed / 4) : 1)
  const x = body.x + Math.cos(body.angle) * body.speed * dt, y = body.y + Math.sin(body.angle) * body.speed * dt
  // If new land grows underneath, pause and fade rather than jump across it.
  if (x > 15 && x < width - 15 && y > 15 && y < height - 15 && distance(x, y) > margin * 0.5) { body.x = x; body.y = y }

}

export function drawTraveler(ctx: CanvasRenderingContext2D, body: SeaTraveler, time: number, alpha: number) {
  ctx.save(); ctx.translate(body.x, body.y); ctx.rotate(body.angle); ctx.globalAlpha = alpha
  if (body.kind === 'boat') {
    const rowing = rowingCycle(time, body.phase)
    if (body.speed > 0.2) {
      const strength = Math.min(1, body.speed / 6)
      const tail = 10 + strength * 16
      ctx.strokeStyle = `rgba(237,255,246,${0.24 * strength})`; ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(-22, -5, -17 - tail, -4 - strength * 5)
      ctx.moveTo(-17, 4); ctx.quadraticCurveTo(-22, 5, -17 - tail, 4 + strength * 5); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(42,119,119,0.14)'; ctx.beginPath(); ctx.ellipse(2, 3, 15, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#e9d98b'; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(0, -7, 15, 0); ctx.quadraticCurveTo(0, 7, -15, 0); ctx.fill()
    ctx.fillStyle = '#66796a'; ctx.beginPath(); ctx.ellipse(-1, 0, 3.5, 2.4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#c6ab7b'; ctx.beginPath(); ctx.arc(1, 0, 1.8, 0, Math.PI * 2); ctx.fill()
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(0, side * 2)
      ctx.rotate(side * (Math.PI / 2 + rowing.angle))
      ctx.strokeStyle = '#8d8b68'; ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8.5, 0); ctx.stroke()
      ctx.fillStyle = '#a69c74'
      ctx.beginPath(); ctx.ellipse(8.5, 0, 2, 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
  } else {
    // From the aerial view turtles stay small, like distant silhouettes in the water.
    ctx.scale(0.62, 0.62)
    const stroke = Math.sin(time * 1.1 + body.phase)
    ctx.fillStyle = '#688d73'
    for (const side of [-1, 1]) {
      // Local +X is the head. Both front flippers attach at the shoulders,
      // sweep outwards, and taper backwards. Mirror before rotating so the
      // two shoulders remain symmetric throughout the slow swimming stroke.
      ctx.save(); ctx.translate(5.5, side * 4.5); ctx.scale(1, side); ctx.rotate(stroke * 0.2)
      ctx.beginPath(); ctx.moveTo(1, -1)
      ctx.bezierCurveTo(6, 2, 3, 11, -5, 16)
      ctx.bezierCurveTo(-7, 16, -4, 8, -3, 5)
      ctx.quadraticCurveTo(-4, 1, 1, -1); ctx.fill()
      ctx.strokeStyle = 'rgba(162,184,141,0.45)'; ctx.lineWidth = 0.6
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.quadraticCurveTo(1, 8, -4, 14); ctx.stroke(); ctx.restore()
      // Rear flippers are small steering paddles at the back of the shell.
      ctx.save(); ctx.translate(-7, side * 4); ctx.scale(1, side); ctx.rotate(-stroke * 0.08)
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.quadraticCurveTo(-2, 5, -8, 6)
      ctx.quadraticCurveTo(-9, 2, -3, -1); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    ctx.beginPath(); ctx.moveTo(-9, -1.2); ctx.lineTo(-14, 0); ctx.lineTo(-9, 1.2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(10, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(14, 0, 3.8, 2.8, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#345d51'
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(15.4, side * 1.65, 0.55, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = '#527b68'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 7.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#a1b38a'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 6.3, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-2, -4); ctx.lineTo(4, -3); ctx.lineTo(6, 0); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.moveTo(-2, -4); ctx.lineTo(-4, -6); ctx.moveTo(4, -3); ctx.lineTo(7, -5); ctx.moveTo(3, 4); ctx.lineTo(4, 6); ctx.stroke()
  }
  ctx.restore()
}
