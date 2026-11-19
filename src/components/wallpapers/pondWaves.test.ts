import { describe, expect, it } from 'vitest'
import { PondWaves } from './pondWaves'

describe('pond wave field', () => {
  it('propagates a click beyond the initial splash', () => {
    const field = new PondWaves(300, 240)
    field.disturb(140, 120)
    const i = Math.round(120 / field.step + 1) * field.cols + Math.round(200 / field.step + 1)
    expect(field.height[i]).toBe(0)
    for (let n = 0; n < 35; n++) field.advance()
    expect(Math.abs(field.height[i])).toBeGreaterThan(.0001)
  })
  it('superposes waves from separate clicks in the same field', () => {
    const a = new PondWaves(200, 160), b = new PondWaves(200, 160), combined = new PondWaves(200, 160)
    a.disturb(65, 80); b.disturb(125, 80)
    combined.disturb(65, 80); combined.disturb(125, 80)
    for (let n = 0; n < 30; n++) { a.advance(); b.advance(); combined.advance() }
    const i = Math.round(80 / a.step + 1) * a.cols + Math.round(95 / a.step + 1)
    expect(Math.abs(a.height[i])).toBeGreaterThan(.0001)
    expect(Math.abs(b.height[i])).toBeGreaterThan(.0001)
    expect(combined.height[i]).toBeCloseTo(a.height[i] + b.height[i], 5)
  })
  it('stays finite under repeated splashes and decays at rest', () => {
    const field = new PondWaves(200, 160)
    for (let n = 0; n < 50; n++) { field.disturb(60 + n % 80, 70); field.advance() }
    const energy = () => field.height.reduce((sum, value) => sum + value * value, 0)
    const initial = energy()
    for (let n = 0; n < 1000; n++) field.advance()
    expect(Number.isFinite(energy())).toBe(true)
    expect(energy()).toBeLessThan(initial * .01)
    field.clear()
    expect(energy()).toBe(0)
  })
})
