/** Damped 2D wave equation. All impulses share one height field and interfere. */
export class PondWaves {
  readonly cols: number
  readonly rows: number
  readonly step: number
  height: Float32Array
  private previous: Float32Array
  private next: Float32Array

  constructor(width: number, height: number) {
    this.step = Math.max(3.5, width / 320, height / 220)
    this.cols = Math.ceil(width / this.step) + 2
    this.rows = Math.ceil(height / this.step) + 2
    this.height = new Float32Array(this.cols * this.rows)
    this.previous = new Float32Array(this.height.length)
    this.next = new Float32Array(this.height.length)
  }

  disturb(x: number, y: number, strength = 3) {
    const cx = x / this.step + 1, cy = y / this.step + 1
    for (let row = Math.max(1, Math.floor(cy - 5)); row <= Math.min(this.rows - 2, cy + 5); row++) {
      for (let col = Math.max(1, Math.floor(cx - 5)); col <= Math.min(this.cols - 2, cx + 5); col++) {
        const r2 = ((col - cx) ** 2 + (row - cy) ** 2) / 2.5
        // A central depression and a small raised rim produce a balanced splash.
        const impulse = strength * (1 - r2) * Math.exp(-r2)
        const i = row * this.cols + col
        this.height[i] += impulse
        this.previous[i] += impulse
      }
    }
  }

  advance() {
    const w = this.cols, h = this.rows
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, value = this.height[i]
      // Include diagonals to reduce directional bias from the square grid.
      const cardinal = this.height[i - 1] + this.height[i + 1] + this.height[i - w] + this.height[i + w]
      const diagonal = this.height[i - w - 1] + this.height[i - w + 1] + this.height[i + w - 1] + this.height[i + w + 1]
      const laplacian = (cardinal * 4 + diagonal - value * 20) / 6
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y)
      const damping = edge < 12 ? .88 + edge / 12 * .115 : .995
      this.next[i] = (2 * value - this.previous[i] + .45 * laplacian) * damping
    }
    const old = this.previous
    this.previous = this.height; this.height = this.next; this.next = old
  }

  clear() { this.height.fill(0); this.previous.fill(0); this.next.fill(0) }
}
