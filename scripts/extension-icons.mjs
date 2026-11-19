import fs from 'node:fs/promises'
import path from 'node:path'
// PNG encoder for a small, dependency-free temporary Stashy icon.
import { deflateSync } from 'node:zlib'
const crc = bytes => { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0) } return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const t = Buffer.from(type); const b = Buffer.alloc(data.length + 12); b.writeUInt32BE(data.length); t.copy(b, 4); data.copy(b, 8); b.writeUInt32BE(crc(Buffer.concat([t, data])), data.length + 8); return b }
const root = path.resolve(import.meta.dirname, '../extension/public/icons')
await fs.mkdir(root, { recursive: true })
for (const size of [16, 32, 48, 128]) {
  const pixels = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size, ny = y / size
    const white = (nx > .27 && nx < .73 && ((ny > .22 && ny < .33) || (ny > .445 && ny < .555) || (ny > .67 && ny < .78))) || (nx > .27 && nx < .39 && ny > .28 && ny < .5) || (nx > .61 && nx < .73 && ny > .5 && ny < .72)
    const i = y * (size * 4 + 1) + 1 + x * 4
    pixels.set(white ? [255,255,255,255] : [66,107,80,255], i)
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8] = 8; header[9] = 6
  await fs.writeFile(path.join(root, `${size}.png`), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header), chunk('IDAT',deflateSync(pixels)), chunk('IEND',Buffer.alloc(0))]))
}
