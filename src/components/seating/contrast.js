/*
 * WCAG 2.x contrast for canvas text (the check Figma shows next to a text colour).
 * Colours can be translucent, so each layer is composited onto what's under it first:
 * canvas background → shape fill (fill opacity) → text (its alpha) → whole object opacity.
 */

/** '#RRGGBB' | 'rgb(r g b / a)' | 'rgb(r, g, b)' | 'rgba(r, g, b, a)' → [r, g, b, a] (0–255, 0–1). */
export function parseColor(c) {
  if (!c || c === 'none') return null
  const hex = /^#([0-9a-f]{6})$/i.exec(c)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c)
  if (!m) return null
  const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4])
  return [Number(m[1]), Number(m[2]), Number(m[3]), a]
}

/** `top` (with alpha × `opacity`) laid over an opaque `bottom`. */
export function over(top, bottom, opacity = 1) {
  if (!top) return bottom
  const a = top[3] * opacity
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1)
}

function luminance([r, g, b]) {
  const ch = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Highest WCAG level the pair meets. Large text = ≥ 24px, or ≥ 18.66px bold (canvas text is
 * medium weight, so only the size rule applies).
 * @returns {{ ratio: number, level: 'AAA' | 'AA' | null, large: boolean }}
 */
export function wcag(text, background, fontSize) {
  const ratio = contrastRatio(text, background)
  const large = fontSize >= 24
  const level = ratio >= (large ? 4.5 : 7) ? 'AAA' : ratio >= (large ? 3 : 4.5) ? 'AA' : null
  return { ratio, level, large }
}

/**
 * Contrast of the text an object shows, as it appears on the canvas.
 * @param {{ text: string, background?: string | null, fillOpacity?: number, opacity?: number }} layers
 *   text: its colour · background: the shape fill under it (none for free text)
 * @param {string} canvas  canvas background colour
 */
export function textContrast({ text, background, fillOpacity = 1, opacity = 1 }, canvas, fontSize) {
  const base = parseColor(canvas) ?? [255, 255, 255, 1]
  const under = over(parseColor(background), base, fillOpacity)
  const ink = over(parseColor(text) ?? [0, 0, 0, 1], under)
  // Object opacity fades text and shape together into the canvas
  return wcag(over([...ink.slice(0, 3), 1], base, opacity), over([...under.slice(0, 3), 1], base, opacity), fontSize)
}
