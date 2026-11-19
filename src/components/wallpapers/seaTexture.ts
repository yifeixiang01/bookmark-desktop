const mix = (a: number, b: number, t: number) => a + (b - a) * t
function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const dx = x - ix, dy = y - iy
  const sx = dx * dx * (3 - 2 * dx), sy = dy * dy * (3 - 2 * dy)
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), sx), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy)
}

export function seaNoise(x: number, y: number) {
  return noise(x, y) * 0.53 + noise(x * 2.03 + 17, y * 2.03 + 9) * 0.27 +
    noise(x * 4.11 + 7, y * 4.11 + 31) * 0.13 + noise(x * 8.21, y * 8.21) * 0.07
}

/** Fixed reef beds, revealed beneath the water rather than painted on the shore. */
export function reefDensity(x: number, y: number) {
  const bed = seaNoise(x * 0.006 + 41, y * 0.006 + 23)
  const coral = seaNoise(x * 0.047, y * 0.047)
  const patch = Math.max(0, Math.min(1, (bed - 0.48) * 7))
  return patch * Math.max(0, Math.min(1, (coral - 0.37) * 4.5))
}
