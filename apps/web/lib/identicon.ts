// Deterministic identicon: 5x5 symmetric pixel grid colored from name hash.
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const HUES = [264, 14, 32, 150, 200, 290, 330, 80, 40, 220]

export function identiconSvg(name: string, sizePx = 64): string {
  const h = hashStr(name || "anon")
  const hue = HUES[h % HUES.length]!
  const fg = `hsl(${hue} 70% 55%)`
  const bg = `hsl(${hue} 30% 18%)`
  const cells: string[] = []
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const bit = (h >> (y * 3 + x)) & 1
      if (!bit) continue
      const xs = [x, 4 - x]
      for (const xx of xs) {
        cells.push(`<rect x="${xx}" y="${y}" width="1" height="1" fill="${fg}"/>`)
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5" width="${sizePx}" height="${sizePx}" preserveAspectRatio="xMidYMid meet"><rect width="5" height="5" fill="${bg}"/>${cells.join("")}</svg>`
}

function b64Encode(s: string): string {
  if (typeof btoa !== "undefined") return btoa(s)
  return Buffer.from(s, "binary").toString("base64")
}

export function identiconDataUrl(name: string, sizePx = 64): string {
  return `data:image/svg+xml;base64,${b64Encode(identiconSvg(name, sizePx))}`
}
