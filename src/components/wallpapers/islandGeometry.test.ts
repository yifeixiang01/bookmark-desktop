import { describe, expect, it } from 'vitest'
import { islandDistance, smoothUnion } from './islandGeometry'

describe('bookmark island geometry', () => {
  const island = { id: 'bookmark', x: 100, y: 100, rx: 45, ry: 55 }
  it('keeps the bookmark on land and distant points in water', () => {
    expect(islandDistance(100, 100, [island])).toBeLessThan(-40)
    expect(islandDistance(300, 100, [island])).toBeGreaterThan(100)
    expect(islandDistance(100, 100, [])).toBeGreaterThan(0)
  })
  it('joins nearby islands across a small gap but separates distant ones', () => {
    const neighbor = { ...island, id: 'neighbor', x: 200 }
    expect(islandDistance(150, 100, [island])).toBeGreaterThan(0)
    expect(islandDistance(150, 100, [island, neighbor])).toBeLessThan(0)
    expect(islandDistance(200, 100, [island, { ...neighbor, x: 300 }])).toBeGreaterThan(0)
  })
  it('supports larger folder islands and follows moved anchors', () => {
    expect(islandDistance(170, 100, [{ ...island, rx: 100, ry: 100 }])).toBeLessThan(0)
    expect(islandDistance(100, 100, [{ ...island, x: 400 }])).toBeGreaterThan(0)
    expect(islandDistance(400, 100, [{ ...island, x: 400 }])).toBeLessThan(0)
    expect(smoothUnion(100, -5)).toBe(-5)
  })
})
