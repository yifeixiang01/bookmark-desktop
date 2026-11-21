export type Pose = 'idle' | 'walk' | 'stretch' | 'sleep' | 'wake' | 'play' | 'pet'

export const WIDTH = 164
export const HEIGHT = 122

export function drawCat(ctx: CanvasRenderingContext2D, pose: Pose, t: number, direction: number) {
  const { sin, cos, PI } = Math
  const ellipse = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient, angle = 0) => {
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, angle, 0, PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
  }
  const gradient = (top: string, bottom: string, y: number, height: number) => {
    const paint = ctx.createLinearGradient(0, y, 0, y + height)
    paint.addColorStop(0, top)
    paint.addColorStop(1, bottom)
    return paint
  }
  const shape = (path: string, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill
    ctx.fill(new Path2D(path))
  }
  const stroke = (path: string, color: string | CanvasGradient, width: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(new Path2D(path))
  }
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.save()
  ctx.translate(direction < 0 ? WIDTH : 0, 0)
  ctx.scale(direction, 1)
  const walk = pose === 'walk'
  const sleep = pose === 'sleep'
  const play = pose === 'play'
  const curl = sleep ? 1 : pose === 'wake' ? Math.max(0, 1 - t / 0.52) : 0
  const stretch = pose === 'stretch' ? sin(PI * Math.min(1, t / 1.4)) : 0
  const jump = play ? 13 * Math.max(0, sin(PI * (t - .35) / .62)) * Number(t >= .35 && t < .97) : 0
  const crouch = play && t < .35 ? 6 * sin(PI * t / .35) : 0
  const lunge = jump * .8
  const phase = t * 2 * PI * 1.45
  const bob = walk ? -2 * Math.abs(sin(phase)) : .9 * sin(t * 3)
  const shadow = ctx.createRadialGradient(75, 106, 0, 75, 106, 64)
  shadow.addColorStop(0, 'rgba(45,24,20,.34)')
  shadow.addColorStop(1, 'rgba(45,24,20,0)')
  ellipse(75, 106, 64 - jump / 3, 9, shadow)

  ctx.translate(lunge, -jump)
  const tail = curl > .55
    ? 'M48 90 C19 87 24 107 49 105 Q77 108 90 97'
    : `M48 78 C23 87 17 67  ${19 + sin(t * 4) * 5} ${52 + sin(t * 3) * 6}`
  stroke(tail, '#af5429', 14)
  stroke(tail, gradient('#ffbe74', '#e37636', 42, 52), 10)
  if (curl <= .55) {
    const tipX = 19 + sin(t * 4) * 5
    const tipY = 52 + sin(t * 3) * 6
    ellipse(tipX, tipY + 2, 6, 9, '#ae5228', .14)
  }

  function paw(x: number, index: number, near: boolean) {
    if (curl > .88 && !near) return
    const cycle = phase + index * PI
    const stride = walk ? 10 * cos(cycle) : 0
    const lift = walk ? 9 * Math.max(0, sin(cycle)) : 0
    const front = x > 65
    ctx.save()
    ctx.globalAlpha = near ? 1 : 1 - curl
    ctx.translate(x + stride + (front ? stretch * 17 : 0), 98 - lift + (near ? 0 : -3) - curl * 2)
    ctx.rotate(stride * .024)
    ellipse(0, -12 + curl * 7, near ? 9 : 7, 17 - curl * 8, gradient(near ? '#fba451' : '#c36536', near ? '#d87035' : '#a94a2a', -28, 35))
    ellipse(2, 1, near ? 10 : 8, 6, gradient(near ? '#fff5dc' : '#e5b591', near ? '#e8a775' : '#c47e56', -5, 12))
    stroke('M3 2 l1 3 M7 1 l1 3', '#a95f4880', 1)
    ctx.restore()
  }

  paw(47, 0, false)
  paw(89, 1, false)
  const bodyY = 76 + curl * 13 + bob + stretch * 4 + crouch
  const coat = gradient('#ffd296', '#d16a33', bodyY - 25, 50)
  ellipse(67, bodyY, 35 + stretch * 6, 23 - curl * 6, coat, -.09)
  ellipse(57, bodyY - 10, 22, 7, '#ffdb9a80', -.2)
  ctx.save()
  ctx.translate(0, bodyY - 76)
  shape('M44 58 Q49 51 54 55 Q52 63 47 70 Q43 70 44 58 M57 54 Q64 50 67 54 Q64 63 59 68 Q55 67 57 54 M71 53 Q78 52 81 55 Q77 62 72 65 Q69 63 71 53', '#b9582a87')
  ctx.restore()
  ellipse(78, bodyY + 9, 19, 10 - curl * 3, gradient('#fff0d3', '#e9a978', bodyY, 21), -.15)
  paw(45 + curl * 9, 1, true)
  paw(86, 0, true)
  if (curl > .75) stroke('M41 95 Q57 109 85 100', '#db7a3e', 8)

  ctx.save()
  ctx.translate(94 - curl * 8 + stretch * 8, 62 + bob + curl * 23 + stretch * 14 + crouch)
  ctx.rotate(curl * .25 + stretch * .19 + (pose === 'pet' ? -.13 : 0))
  ctx.scale(1 - curl * .12, 1 - curl * .14)
  const head = gradient('#ffd49a', '#e68442', -35, 61)
  shape('M-28 -12 Q-38 -29 -34 -43 Q-31 -49 -10 -29 L11 -31 Q23 -51 31 -45 Q36 -38 33 -14 Q42 2 31 14 Q25 27 5 27 Q-17 29 -29 16 Q-39 6 -28 -12', head)
  shape('M-28 -19 Q-34 -33 -31 -39 Q-27 -40 -17 -27Z M18 -28 Q27 -43 30 -40 Q32 -34 28 -20Z', gradient('#a95652', '#ffc0a6', -43, 27))
  shape('M-11 -28 Q-8 -30 -4 -29 L0 -12 Q-5 -8 -11 -28 M3 -30 Q7 -30 11 -29 Q8 -17 4 -16Z M-32 -4 Q-22 -5 -18 1 Q-23 4 -33 2Z M-33 5 Q-23 4 -20 9 Q-24 12 -31 11Z M37 -3 Q29 -5 25 1 Q29 4 36 2Z', '#b96030a6')
  shape('M-30 9 Q-27 1 -17 4 Q-9 9 -4 1 Q2 -7 10 2 Q15 8 22 5 Q32 4 32 12 Q23 27 5 27 Q-18 28 -30 9', gradient('#fff9e9', '#f3c49e', 1, 27))
  const closed = curl > .65 || pose === 'pet' || t % 3.9 > 3.76
  for (const x of [-13, 18]) {
    if (closed) {
      stroke(`M${x - 5} 0 q5 5 10 0`, '#673723', 2.2)
    } else {
      ellipse(x, -3, 6.5, 8, '#74402b')
      ellipse(x + .4, -2, 5.4, 6.8, gradient('#372921', '#986236', -9, 14))
      ellipse(x - 1.5, -5, 2.2, 2.5, '#fff9e9')
      ellipse(x + 2.4, .3, 1, 1, '#ffdcb9')
    }
  }
  ellipse(-18, 9, 7, 3.2, '#ed897e80')
  ellipse(23, 9, 6, 3.2, '#ed897e80')
  shape('M-1 6 Q4 3 9 6 Q10 9 4 12 Q-2 9 -1 6', gradient('#d88776', '#8e4537', 4, 9))
  stroke('M4 11 v3 m0 0 q-4 5 -8 0 m8 0 q4 5 8 0', '#754435', 1.35)
  stroke('M-23 10 l-12 -3 m12 7 l-13 2 M25 11 l11 -4 m-11 8 l11 1', '#884e3a99', 1.05)
  ctx.restore()

  if (sleep || pose === 'pet') {
    ctx.font = sleep ? 'bold 16px sans-serif' : 'bold 21px sans-serif'
    ctx.textAlign = 'center'
    ctx.save()
    // Keep the glyph readable when the cat turns left.
    ctx.translate(127, 48 - 6 * sin(t * 3))
    ctx.scale(direction, 1)
    ctx.strokeStyle = '#754435'
    ctx.lineWidth = 2.2
    ctx.strokeText(sleep ? 'z' : '♥', 0, 0)
    ctx.fillStyle = sleep ? '#fff2d7' : '#ffadb0'
    ctx.fillText(sleep ? 'z' : '♥', 0, 0)
    ctx.restore()
  }
  ctx.translate(-lunge, jump)
  if (play) {
    const roll = Math.max(0, Math.min(1, (t - .75) / .55))
    const x = 134 + roll * 15
    const y = 99 - sin(roll * PI) * 13
    ellipse(x, y, 9, 9, gradient('#ff9e91', '#a83f63', y - 9, 18))
    stroke(`M${x - 7} ${y - 4} q8 0 11 10 m-8 -13 q7 1 11 10 m-5 -7 q-1 9 -8 10`, '#ffd0b7', 1.05)
  }
  ctx.restore()
}
