export interface PondPoint { x: number; y: number }
export interface PondFish extends PondPoint { angle: number; target: PondPoint; color: string; phase: number }
export interface PondFood extends PondPoint { id: number; expiresAt: number; bites: number }
export const inPond = ({ x, y }: PondPoint) => ((x - 500) / 315) ** 2 + ((y - 355) / 156) ** 2 < .95
export const createFish = (): PondFish[] => [
  { x: 350, y: 310, angle: 0, target: { x: 650, y: 380 }, color: '#ed9263', phase: 0 },
  { x: 600, y: 400, angle: Math.PI, target: { x: 350, y: 380 }, color: '#f4dfb6', phase: 2 },
  { x: 480, y: 430, angle: -1, target: { x: 550, y: 290 }, color: '#dd7766', phase: 4 },
]

/** Simulation remains local; only feeding totals and weather enter saved state. */
export function stepFish(fish: PondFish[], food: PondFood[], dt: number, time: number) {
  for (const f of fish) {
    const meal = food.filter(p => p.bites > 0 && p.expiresAt > time).sort((a, b) => Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0]
    if (meal) f.target = meal
    else if (Math.hypot(f.target.x - f.x, f.target.y - f.y) < 20) {
      const angle = time / 2500 + f.phase
      f.target = { x: 500 + Math.cos(angle) * 230, y: 355 + Math.sin(angle * 1.3) * 100 }
    }
    const distance = Math.hypot(f.target.x - f.x, f.target.y - f.y)
    const desired = Math.atan2(f.target.y - f.y, f.target.x - f.x)
    const turn = Math.atan2(Math.sin(desired-f.angle), Math.cos(desired-f.angle))
    f.angle += Math.max(-dt * 2.5, Math.min(dt * 2.5, turn))
    const speed = meal ? Math.min(95, distance * 2) : 24
    if (distance > 6) { f.x += Math.cos(f.angle) * speed * dt; f.y += Math.sin(f.angle) * speed * dt }
    // Constrain curved turns inside the water, including when retargeted at the bank.
    const radius = Math.hypot((f.x-500)/295, (f.y-355)/140)
    if (radius > 1) { f.x = 500+(f.x-500)/radius; f.y = 355+(f.y-355)/radius }
    if (meal && distance < 19) { meal.bites = Math.max(0, meal.bites - dt * 2.2) }
  }
}
