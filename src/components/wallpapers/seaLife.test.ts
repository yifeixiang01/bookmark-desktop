import { describe, expect, it } from 'vitest'
import { advanceTraveler, rowingCycle, type SeaTraveler } from './seaLife'

describe('gentle continuous rowing', () => {
  it('keeps the paddle sweep small and continuous', () => {
    for (let t = 0; t < 40; t += 0.1) {
      expect(Math.abs(rowingCycle(t, 0).angle)).toBeLessThanOrEqual(0.1)
      expect(Math.abs(rowingCycle(t + 0.01, 0).angle - rowingCycle(t, 0).angle)).toBeLessThan(0.001)
    }
  })
  it('keeps moving gently through the entire cycle', () => {
    const body: SeaTraveler = { x: 500, y: 500, speed: 4.5, angle: 0, phase: 0, kind: 'boat', ready: true }
    for (let t = 0; t < 40; t += 1 / 60) {
      const old = { x: body.x, y: body.y }
      advanceTraveler(body, 1 / 60, t, 2000, 2000, () => 220)
      expect(body.speed).toBeGreaterThan(3.5)
      expect(body.speed).toBeLessThan(5.5)
      expect(Math.hypot(body.x - old.x, body.y - old.y)).toBeGreaterThan(0)
    }
  })
})
