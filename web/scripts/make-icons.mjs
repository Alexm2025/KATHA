// Generates the PWA icons as plain PNGs (no image dependencies).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}

function icon(size, pad) {
  const terra = [184, 74, 34], cream = [251, 243, 228], leaf = [47, 107, 52], saffron = [232, 133, 28]
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const c = size / 2
  const r = size * (0.5 - pad) * 0.72
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c
      let col = terra
      if (Math.hypot(dx, dy) < r) {
        col = cream
        // two halves of the "brain" motif: saffron left, leaf right
        const inner = Math.hypot(dx, dy) < r * 0.74
        if (inner && Math.abs(dx) > r * 0.07) col = dx < 0 ? saffron : leaf
        if (inner && Math.hypot(Math.abs(dx) - r * 0.36, dy) < r * 0.13) col = cream
      }
      const i = y * (size * 4 + 1) + 1 + x * 4
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]; raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('icon-192.png', out), icon(192, 0))
writeFileSync(new URL('icon-512.png', out), icon(512, 0))
writeFileSync(new URL('icon-maskable-512.png', out), icon(512, 0.1))
writeFileSync(new URL('apple-touch-icon.png', out), icon(180, 0))
console.log('icons written')
