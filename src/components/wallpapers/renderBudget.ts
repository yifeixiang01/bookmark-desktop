/** Keep fullscreen backing buffers bounded, especially on 4K/Retina displays. */
export function wallpaperPixelRatio(width: number, height: number) {
  return Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_800_000 / Math.max(1, width * height)))
}
