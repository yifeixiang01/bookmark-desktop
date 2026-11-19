export interface IslandAnchor {
  id: string
  x: number
  y: number
  /** Half dimensions of the rounded land mass, in viewport pixels. */
  rx: number
  ry: number
}

export function smoothUnion(a: number, b: number, blend = 38): number {
  const h = Math.max(blend - Math.abs(a - b), 0) / blend
  return Math.min(a, b) - h * h * blend * 0.25
}

/** Signed distance: negative is land; positive is sea. Nearby islands blend. */
export function anchorDistance(x: number, y: number, anchor: IslandAnchor): number {
  const radius = Math.min(anchor.rx, anchor.ry) * 0.75
  const dx = Math.abs(x - anchor.x) - anchor.rx + radius
  const dy = Math.abs(y - anchor.y) - anchor.ry + radius
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius
}

export function islandDistance(x: number, y: number, anchors: readonly IslandAnchor[]): number {
  let distance = 10000
  for (const anchor of anchors) {
    distance = smoothUnion(distance, anchorDistance(x, y, anchor))
  }
  return distance
}

/** Fixed spatial noise keeps the coast organic without flickering during a drag. */
export function coastNoise(x: number, y: number): number {
  return Math.sin(x * 0.023 + Math.sin(y * 0.017) * 1.8) * 4.5 +
    Math.sin(y * 0.041 + x * 0.012) * 2.5 + Math.sin(x * 0.083 - y * 0.067) * 1.2
}
