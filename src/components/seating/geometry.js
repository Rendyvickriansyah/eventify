/*
 * Scene model for the seating editor. Every object lives in world units with a bounding box
 * {x, y, w, h}; polygons keep their points normalised to 0…1 inside that box, so moving and
 * resizing are the same operation for every shape type.
 *
 * @typedef {{
 *   id: string,
 *   type: 'rect' | 'ellipse' | 'polygon' | 'section' | 'text' | 'image',
 *   x: number, y: number, w: number, h: number,
 *   points?: [number, number][],   // polygon, normalised
 *   fill?: string,                 // drawing colour (assigned objects use their tier colour)
 *   name?: string,                 // label drawn in the middle (sections, assigned shapes)
 *   text?: string, fontSize?: number,
 *   src?: string, opacity?: number, locked?: boolean,   // guide image
 *   tierId?: string, seatingType?: string, seats?: number,
 * }} SceneObject
 */

export const DEFAULT_FILL = '#E5E5E5'
/** Shapes start with a 1-unit white stroke (the section outlines in the Figma stadium). */
export const DEFAULT_STROKE = '#FFFFFF'
export const MIN_SIZE = 4
/** Objects a ticket tier can be assigned to (everything but labels and guide images). */
export const isAssignable = (o) => o.type !== 'text' && o.type !== 'image'

let seq = 0
export const newId = (prefix = 'obj') => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`

/** Box from two corner points (any drag direction). `square` locks 1:1 (Shift). */
export function boxFrom(a, b, square = false) {
  let w = b.x - a.x
  let h = b.y - a.y
  if (square) {
    const s = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w || 1) * s
    h = Math.sign(h || 1) * s
  }
  return { x: Math.min(a.x, a.x + w), y: Math.min(a.y, a.y + h), w: Math.abs(w), h: Math.abs(h) }
}

/** Union bounding box of objects (null when empty). */
export function boundsOf(all) {
  const objects = all.filter((o) => o.type !== 'group')
  if (!objects.length) return null
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const o of objects) {
    x1 = Math.min(x1, o.x); y1 = Math.min(y1, o.y)
    x2 = Math.max(x2, o.x + o.w); y2 = Math.max(y2, o.y + o.h)
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/** Regular polygon / star outline normalised to its own bounding box (first point at the top). */
function radial(count, inner = null) {
  const pts = []
  const n = inner ? count * 2 : count
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const r = inner && i % 2 ? inner : 1
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return pts.map(([x, y]) => [Math.round(((x - x0) / (x1 - x0)) * 1e4) / 1e4, Math.round(((y - y0) / (y1 - y0)) * 1e4) / 1e4])
}

/** Shape tool kinds drawn as polygons (rectangle / ellipse have their own types). */
export const polygonPresets = {
  triangle: { label: 'Triangle', points: [[0.5, 0], [1, 1], [0, 1]] },
  diamond: { label: 'Diamond', points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]] },
  pentagon: { label: 'Pentagon', points: radial(5) },
  hexagon: { label: 'Hexagon', points: radial(6) },
  star: { label: 'Star', points: radial(5, 0.4) },
}

/** Absolute polygon points → bounding box + normalised points. */
export function polygonFrom(points) {
  const box = boundsOf(points.map((p) => ({ x: p.x, y: p.y, w: 0, h: 0 })))
  const w = Math.max(box.w, 1)
  const h = Math.max(box.h, 1)
  return { x: box.x, y: box.y, w, h, points: points.map((p) => [(p.x - box.x) / w, (p.y - box.y) / h]) }
}

/** Objects whose outline can be reshaped point by point (double-click). */
export const isPathEditable = (o) => o && !o.path && !o.dots && (o.type === 'rect' || o.type === 'section' || o.type === 'polygon')

/** Outline in world units: the polygon's points, or a rectangle's four corners. */
export function absolutePoints(o) {
  const pts = o.points ?? [[0, 0], [1, 0], [1, 1], [0, 1]]
  return pts.map(([px, py]) => ({ x: o.x + px * o.w, y: o.y + py * o.h }))
}

/** Closest point to `p` on segment a→b. */
export function projectOnSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return { x: a.x + dx * t, y: a.y + dy * t }
}

/**
 * Curved outlines (imported vectors): `path` = absolute commands with coordinates normalised to
 * the box, e.g. [['M', 0.1, 0], ['C', …], ['Z']]. Drawn in world units, so a resize reshapes it.
 */
export const pathD = (o) => o.path.map(([c, ...n]) => c + n.map((v, i) => (i % 2 === 0 ? o.x + v * o.w : o.y + v * o.h)).join(' ')).join(' ')

/**
 * Seat-dot sections (imported seat maps): `dots` = seat centres normalised to the box, drawn as
 * one path of circles (`dotR` world units) — thousands of seats stay one element per section.
 * `hull` is the outline around them that takes clicks. Paths are cached per object version.
 */
const dotsCache = new WeakMap()
export function dotsD(o) {
  let d = dotsCache.get(o)
  if (d) return d
  const r = o.dotR ?? 4
  d = o.dots.map(([px, py]) => {
    const cx = o.x + px * o.w
    const cy = o.y + py * o.h
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
  }).join('')
  dotsCache.set(o, d)
  return d
}
export const hullPath = (o) => o.hull.map(([px, py], i) => `${i ? 'L' : 'M'}${o.x + px * o.w} ${o.y + py * o.h}`).join(' ') + ' Z'

export const polygonPath = (o) => o.points.map(([px, py], i) => `${i ? 'L' : 'M'}${o.x + px * o.w} ${o.y + py * o.h}`).join(' ') + ' Z'

/**
 * Resize a selection by dragging one handle. `handle` is two letters/one letter of n/s/e/w;
 * every object scales with the selection box, anchored at the opposite edge.
 */
export function resizeObjects(objects, start, handle, dx, dy, keepRatio) {
  let { x, y, w, h } = start
  if (handle.includes('e')) w = start.w + dx
  if (handle.includes('s')) h = start.h + dy
  if (handle.includes('w')) { x = start.x + dx; w = start.w - dx }
  if (handle.includes('n')) { y = start.y + dy; h = start.h - dy }
  if (keepRatio && start.w && start.h) {
    const ratio = start.w / start.h
    if (handle.length === 2) {
      if (Math.abs(w / start.w) > Math.abs(h / start.h)) h = w / ratio
      else w = h * ratio
      if (handle.includes('w')) x = start.x + start.w - w
      if (handle.includes('n')) y = start.y + start.h - h
    }
  }
  w = Math.max(w, MIN_SIZE)
  h = Math.max(h, MIN_SIZE)
  const sx = start.w ? w / start.w : 1
  const sy = start.h ? h / start.h : 1
  return objects.map((o) => {
    const next = { ...o, x: x + (o.x - start.x) * sx, y: y + (o.y - start.y) * sy, w: Math.max(o.w * sx, 1), h: Math.max(o.h * sy, 1) }
    if (o.type === 'text') next.fontSize = Math.max(6, Math.round(o.fontSize * sy * 10) / 10)
    return next
  })
}

let measureCtx = null
let fontFamily = null
/** Width of a text object in world units, in the app's own font (medium). */
export function measureText(text, fontSize) {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  fontFamily ??= getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
  measureCtx.font = `500 ${fontSize}px ${fontFamily}`
  return Math.max(measureCtx.measureText(text || ' ').width, fontSize / 2)
}

/**
 * Text inside a shape (`name`): `labelSize` (world units) or auto — shrinks to fit the box
 * width, 5–14; `labelColor` or auto — readable on the fill.
 */
export function labelFontSize(o) {
  if (o.labelSize) return o.labelSize
  const chars = Math.max(1, String(o.name ?? '').length)
  return Math.max(5, Math.min(14, Math.min(o.w, o.h) * 0.32, (o.w * 0.86) / (chars * 0.6)))
}

/** The fill a shape shows: its tier's colour when assigned, 'none' when removed / hidden. */
export function effectiveFill(o, tierColor) {
  if (o.tierId && tierColor) return tierColor
  if (o.fill === null || o.fillHidden) return 'none'
  return o.fill || (o.type === 'text' ? '#0A0A0A' : DEFAULT_FILL)
}

/** Automatic label colour: dark grey on the default / no fill (≥ 4.5:1 there), else labelColor(). */
export const autoLabelColor = (fill) => (fill === DEFAULT_FILL || fill === 'none' ? 'rgb(0 0 0 / 0.65)' : labelColor(fill))

/**
 * Alignment — `textAlign` on free text, `labelAlign` on a shape's label: 'left' | 'center' | 'right'.
 * Returns the anchor x and SVG text-anchor. Labels keep an inset from the shape's sides.
 */
const anchors = { left: 'start', center: 'middle', right: 'end' }
export function textAnchorX(o) {
  const align = o.textAlign ?? 'left'
  return { x: align === 'center' ? o.x + o.w / 2 : align === 'right' ? o.x + o.w : o.x, anchor: anchors[align] }
}
export function labelAnchorX(o) {
  const align = o.labelAlign ?? 'center'
  if (align === 'center') return { x: o.x + (o.labelX ?? 0.5) * o.w, anchor: 'middle' }
  const pad = Math.min(8, o.w * 0.08)
  return align === 'left' ? { x: o.x + pad, anchor: 'start' } : { x: o.x + o.w - pad, anchor: 'end' }
}

/** Text colour that stays readable on `fill` (white on mid/dark fills). */
export function labelColor(fill) {
  const m = /^#?([0-9a-f]{6})$/i.exec(fill ?? '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? 'rgb(0 0 0 / 0.6)' : '#ffffff'
}

/*
 * Transform & appearance. Objects may carry `rotation` (degrees, about the centre),
 * `flipX` / `flipY`, `opacity` (0…1), `radius` (rectangles and sections) and `hidden`.
 */

/** Guide images default to 50% so they read as a backdrop. */
export const objectOpacity = (o) => o.opacity ?? (o.type === 'image' ? 0.5 : 1)

/** Corner radius in world units — only plain rectangles/sections (not reshaped ones) have corners to round. */
export const hasCorners = (o) => (o.type === 'rect' || o.type === 'section') && !o.points && !o.path && !o.dots
export const cornerRadius = (o) => (hasCorners(o) ? Math.min(o.radius ?? (o.type === 'section' ? 2 : 0), o.w / 2, o.h / 2) : 0)

/** SVG transform for rotation + flips about the object's centre (undefined when untouched). */
export function transformOf(o) {
  if (!o.rotation && !o.flipX && !o.flipY) return undefined
  const cx = o.x + o.w / 2
  const cy = o.y + o.h / 2
  return `rotate(${o.rotation || 0} ${cx} ${cy}) translate(${cx} ${cy}) scale(${o.flipX ? -1 : 1} ${o.flipY ? -1 : 1}) translate(${-cx} ${-cy})`
}

/** Folds rotation and flips into the outline's points, so they can be edited directly. */
export function bakeTransform(o) {
  const cx = o.x + o.w / 2
  const cy = o.y + o.h / 2
  const a = ((o.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const pts = absolutePoints(o).map(({ x, y }) => {
    const dx = (x - cx) * (o.flipX ? -1 : 1)
    const dy = (y - cy) * (o.flipY ? -1 : 1)
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
  })
  const { rotation: _r, flipX: _fx, flipY: _fy, ...rest } = o
  return { ...rest, ...polygonFrom(pts) }
}

/** Normalises degrees to (-180, 180]. */
export function normalizeAngle(deg) {
  let d = ((Number(deg) % 360) + 360) % 360
  if (d > 180) d -= 360
  return Math.round(d * 10) / 10
}

/**
 * Paint state. `fill` / `stroke` = null means removed (Figma's −); undefined → the default.
 * Fill: fillOpacity, fillHidden. Stroke: strokeOpacity, strokeHidden, strokeWidth (world
 * units — it scales with zoom, like a vector), strokePosition 'inside' | 'center' | 'outside'.
 */
export function strokeOf(o) {
  const color = o.stroke === undefined ? DEFAULT_STROKE : o.stroke
  return { color, width: o.strokeWidth ?? 1, position: o.strokePosition ?? 'center', visible: Boolean(color) && !o.strokeHidden }
}
