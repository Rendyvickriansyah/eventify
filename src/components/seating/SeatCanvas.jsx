import { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from '@/components/ui/Toast'
import { downscale } from '@/components/ui/ImageUpload'
import tooltipArrow from '@/assets/icons/seating-editor/tooltip-arrow.svg'
import { isGroup, leafIds, chainOf, effectiveFlags, childrenFront, collect, pasteItems, groupItems, ungroupItems, removeItems, restack, outermost } from './layers'
import {
  DEFAULT_FILL, strokeOf, cornerRadius, objectOpacity, transformOf, bakeTransform, isAssignable, isPathEditable, absolutePoints, projectOnSegment, boxFrom, boundsOf, intersects, labelColor, measureText, newId, polygonFrom, polygonPath, pathD, dotsD, hullPath, polygonPresets, resizeObjects, labelFontSize, autoLabelColor, textAnchorX, labelAnchorX,
} from './geometry'

/*
 * Seating canvas — a vector (SVG) scene with a Figma-style viewport. Shapes stay crisp at any
 * zoom (strokes don't scale); there's no layout grid — a 1-unit pixel grid fades in from 400%
 * and is fully in at 800% (max 3200%), drawn over the shapes like Figma's.
 *   scroll = pan · Ctrl/⌘ + scroll or pinch = zoom at the pointer · Space/middle-drag = pan
 *   ⌘/Ctrl + = / − zoom · Shift+1 fit · Shift+0 100%
 * Tools: Select (click, Shift-click, drag on empty space to marquee, drag to move, 8 handles
 * to resize — Shift keeps the ratio), Shape (rectangle / ellipse), Section (numbered seat
 * block), Pen (click points; click the first point, double-click or Enter to close), Text,
 * Image (a guide to trace — drop a file anywhere too).
 *
 * Layers: clicks pick the outer-most group (⌘/Ctrl-click picks the shape itself; once inside a
 * group, clicks stay at that level; double-click goes one level in). ⌘G / ⇧⌘G group and
 * ungroup, ⌘] ⌘[ (+⇧ to the end) restack, ⇧⌘H hides, ⇧⌘L locks. Hidden layers aren't drawn;
 * locked ones can't be picked on the canvas (only from the layers panel).
 *
 * Typing happens on the canvas, like Figma: the Text tool (T) + click empty space starts a new
 * text with a blinking caret; + click inside a shape types that shape's label (centred, turns with
 * the shape, shrinks to fit). Double-click a text — or select a text/shape and press Enter — to
 * edit it again. Enter, Esc or a click away finishes; a text left empty is removed.
 *
 * Point editing: double-click a rectangle, section or pen shape to show its points. Drag a
 * point anywhere (Shift snaps the edge before it to 45°); hover an edge and click to add a
 * point — it is grabbed straight away so you can drag it. Delete removes the active point,
 * Esc / Enter or a click outside finishes.
 *
 * Assign mode (`armedTier`): clicking or marquee-selecting objects selects them for that
 * tier — they preview its colour, a "Selected" tooltip sits above them and a chip with the
 * tier follows the pointer. Objects don't move in this mode, so a click can't nudge them.
 */

const SELECT = '#2B7FFF'
const HANDLE = 8
const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const handleCursor = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
const defaults = { rect: [120, 80], ellipse: [100, 100], section: [100, 60], polygon: [100, 100] }
const MAX_ZOOM = 32 // 3200% — far enough in to place points on the pixel grid
const clampZoom = (k) => Math.min(MAX_ZOOM, Math.max(0.1, k))
/* Pixel grid (1 world unit) like Figma: invisible below 400%, fully in at 800%. */
const GRID_FROM = 4
const GRID_FULL = 8
const isTyping = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]')

/**
 * @param {{
 *   ref?: React.Ref<{ addImage: (file: File) => void }>,
 *   objects: import('./geometry').SceneObject[],
 *   scene: ReturnType<typeof import('./useScene').useScene>,
 *   tool: string, setTool: (t: string) => void,
 *   shapeKind: 'rect' | 'ellipse' | keyof typeof polygonPresets,   // Shape tool dropdown
 *   selection: string[], setSelection: (ids: string[] | ((ids: string[]) => string[])) => void,
 *   tierById: Record<string, { id: string, name: string, color: string }>,
 *   armedTier: { id: string, name: string, color: string } | null, onDisarm: () => void,
 *   background: string,
 *   highlight?: string[],   // layers-panel hover: outline these on the canvas
 * }} props
 */
export function SeatCanvas({ ref, objects, scene, tool, setTool, shapeKind, selection, setSelection, tierById, armedTier, onDisarm, background, highlight = [] }) {
  const wrapRef = useRef(null)
  const chipRef = useRef(null)
  const [view, setView] = useState(null) // { x, y, k } — null until measured
  const viewRef = useRef(view)
  viewRef.current = view
  const gesture = useRef(null)
  const [marquee, setMarquee] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const [pen, setPen] = useState(null) // { points: {x,y}[], cursor: {x,y} }
  const [space, setSpace] = useState(false)
  const [panning, setPanning] = useState(false)
  const [chipVisible, setChipVisible] = useState(false)
  const clipboard = useRef(null)
  const [labelEdit, setLabelEdit] = useState(null) // { id, base, isNew? } — typing a text / shape label in place
  const [editing, setEditing] = useState(null) // { id, active: index | null } — point editing
  const [edgeHover, setEdgeHover] = useState(null) // world point where a click would add a point
  const penRaw = useRef(null) // unsnapped pointer position, so Shift can snap/unsnap in place
  const latest = useRef({})
  latest.current = { objects, selection, tool, armedTier, pen, editing, labelEdit }

  const flags = useMemo(() => effectiveFlags(objects), [objects])
  const selectedLeafIds = useMemo(() => leafIds(objects, selection), [objects, selection])
  const selected = objects.filter((o) => selectedLeafIds.has(o.id))
  const selectedGroups = objects.filter((o) => isGroup(o) && selection.includes(o.id))
  const selectedBox = boundsOf(selected)

  /** What a click on leaf `id` selects: the outer-most group, unless the selection is already inside it. */
  const pickFor = (id, deep) => {
    if (deep || armedTier) return id
    const chain = chainOf(objects, id) // [leaf, parent, …, top]
    for (const sid of selection) {
      const sp = objects.find((o) => o.id === sid)?.groupId
      if (sp && chain.includes(sp)) return chain[chain.indexOf(sp) - 1]
    }
    return chain.at(-1)
  }

  /* ── Viewport ───────────────────────────────────────────── */
  const toWorld = useCallback((clientX, clientY) => {
    const r = wrapRef.current.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k }
  }, [])

  const zoomAt = useCallback((factor, sx, sy) => {
    setView((v) => {
      const r = wrapRef.current.getBoundingClientRect()
      const px = sx ?? r.width / 2
      const py = sy ?? r.height / 2
      const k = clampZoom(v.k * factor)
      return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
    })
  }, [])

  const fit = useCallback((list = latest.current.objects) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    const b = boundsOf(list.filter((o) => !isGroup(o) && !o.hidden))
    if (!b) return setView({ x: r.width / 2, y: r.height / 2, k: 1 })
    const k = clampZoom(Math.min((r.width - 120) / Math.max(b.w, 1), (r.height - 120) / Math.max(b.h, 1), 2))
    setView({ k, x: r.width / 2 - (b.x + b.w / 2) * k, y: r.height / 2 - (b.y + b.h / 2) * k })
  }, [])

  // First measure: fit what's there, else put world (0,0) in the middle.
  useLayoutEffect(() => { fit() }, [fit])

  // Wheel must be non-passive to stop the page zooming/scrolling.
  useEffect(() => {
    const el = wrapRef.current
    function onWheel(e) {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025) * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 4 : 1)), e.clientX - r.left, e.clientY - r.top)
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* ── Creating objects ───────────────────────────────────── */
  const sectionNumber = () => {
    const nums = latest.current.objects.filter((o) => o.type === 'section').map((o) => Number(o.name)).filter(Number.isFinite)
    return String((nums.length ? Math.max(...nums) : 0) + 1)
  }

  const finishPen = useCallback(() => {
    const p = latest.current.pen
    setPen(null)
    if (!p || p.points.length < 3) return
    const obj = { id: newId(), type: 'polygon', fill: DEFAULT_FILL, ...polygonFrom(p.points) }
    scene.apply((list) => [...list, obj])
    setSelection([obj.id])
    setTool('select')
  }, [scene, setSelection, setTool])

  const addImage = useCallback(async (file, at) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('That file isn’t an image', { description: 'Use a JPG, PNG or WebP of the venue plan to trace over.' })
      return
    }
    try {
      const src = await downscale(file, 1600)
      const img = new Image()
      img.src = src
      await img.decode()
      const r = wrapRef.current.getBoundingClientRect()
      const v = viewRef.current
      const scale = Math.min(1, (r.width * 0.8) / v.k / img.width, (r.height * 0.8) / v.k / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const c = at ?? { x: (r.width / 2 - v.x) / v.k, y: (r.height / 2 - v.y) / v.k }
      const obj = { id: newId('img'), type: 'image', src, x: c.x - w / 2, y: c.y - h / 2, w, h, opacity: 0.5, locked: false }
      scene.apply((list) => [obj, ...list]) // guides sit behind everything
      setSelection([obj.id])
      setTool('select')
    } catch {
      toast.error('Couldn’t read that image', { description: 'Try exporting it again as JPG or PNG.' })
    }
  }, [scene, setSelection, setTool])

  useImperativeHandle(ref, () => ({ addImage, fit: () => fit() }), [addImage, fit])

  /* ── Pointer gestures ───────────────────────────────────── */
  function onPointerDown(e) {
    if (!view || (e.button !== 0 && e.button !== 1)) return
    const target = e.target
    const p = toWorld(e.clientX, e.clientY)
    wrapRef.current.focus({ preventScroll: true })

    if (e.button === 1 || space) {
      e.preventDefault()
      gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view }
      setPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'pen') {
      const pts = pen?.points ?? []
      const first = pts[0]
      if (first && pts.length >= 3 && Math.hypot((first.x - p.x) * view.k, (first.y - p.y) * view.k) < 10) return finishPen()
      // Shift: the new segment snaps to 0/45/90° from the previous point.
      const q = e.shiftKey && pts.length ? snap45(pts.at(-1), p) : p
      penRaw.current = p
      setPen({ points: [...pts, q], cursor: q })
      return
    }

    if (tool === 'text') {
      const hitId = target.closest?.('[data-id]')?.dataset.id
      const hit = objects.find((o) => o.id === hitId)
      if (hit && isAssignable(hit)) {
        // Stop the follow-up mousedown from moving focus to the canvas (it would blur the new input)
        e.preventDefault()
        setSelection([hit.id])
        setTool('select')
        setLabelEdit({ id: hit.id, base: objects })
        return
      }
      e.preventDefault() // keep focus for the caret (see above)
      const fontSize = Math.round(16 / Math.max(view.k, 0.25))
      const obj = { id: newId(), type: 'text', text: '', fontSize, fill: '#0A0A0A', x: p.x, y: p.y - fontSize * 0.625, w: 0, h: fontSize * 1.25 }
      scene.preview([...objects, obj])
      setSelection([obj.id])
      setTool('select')
      setLabelEdit({ id: obj.id, base: objects, isNew: true })
      return
    }

    if (tool === 'shape' || tool === 'section') {
      const preset = tool === 'shape' && polygonPresets[shapeKind]
      const type = tool === 'section' ? 'section' : preset ? 'polygon' : shapeKind
      const obj = {
        id: newId(), type, fill: DEFAULT_FILL, x: p.x, y: p.y, w: 0, h: 0,
        ...(type === 'section' && { name: sectionNumber() }),
        ...(preset && { points: preset.points, layerName: preset.label }),
      }
      gesture.current = { kind: 'create', start: p, base: objects, obj, moved: false }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    // Point editing: drag a point, or click an edge to add one (and keep dragging it).
    if (editing) {
      const o = objects.find((x) => x.id === editing.id)
      const vertex = target.closest?.('[data-vertex]')?.dataset.vertex
      const edge = target.closest?.('[data-edge]')?.dataset.edge
      if (o && (vertex != null || edge != null)) {
        let pts = absolutePoints(o)
        let index = Number(vertex)
        if (vertex == null) {
          const i = Number(edge)
          index = i + 1
          pts = [...pts.slice(0, index), projectOnSegment(p, pts[i], pts[(i + 1) % pts.length]), ...pts.slice(index)]
          scene.preview(objects.map((x) => (x.id === o.id ? { ...x, ...polygonFrom(pts) } : x)))
          setEdgeHover(null)
        }
        setEditing({ id: o.id, active: index })
        gesture.current = { kind: 'vertex', id: o.id, index, pts, start: p, base: objects, moved: vertex == null }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
      if (target.closest?.('[data-id]')?.dataset.id === editing.id) { setEditing({ id: editing.id, active: null }); return }
      setEditing(null) // clicked elsewhere — finish, then handle the click normally
    }

    // Select tool (and assign mode)
    const handle = target.closest?.('[data-handle]')?.dataset.handle
    if (handle && selectedBox && !armedTier) {
      gesture.current = { kind: 'resize', handle, start: p, box: selectedBox, base: objects, ids: new Set(selectedLeafIds) }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    let id = target.closest?.('[data-id]')?.dataset.id
    // Assigning only picks sections and shapes — a click on a label or guide starts a marquee.
    if (id && armedTier && !isAssignable(objects.find((o) => o.id === id) ?? {})) id = null
    if (id) {
      const pick = pickFor(id, e.metaKey || e.ctrlKey)
      if (e.shiftKey) {
        setSelection((ids) => (ids.includes(pick) ? ids.filter((x) => x !== pick) : [...ids, pick]))
        return
      }
      const ids = selection.includes(pick) ? selection : [pick]
      if (!selection.includes(pick)) setSelection([pick])
      if (!armedTier) {
        gesture.current = { kind: 'move', start: p, base: objects, ids: leafIds(objects, ids), moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    gesture.current = { kind: 'marquee', start: p, keep: e.shiftKey ? selection : [] }
    if (!e.shiftKey) setSelection([])
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    // Assign chip follows the pointer without re-rendering.
    if (chipRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      chipRef.current.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 18}px)`
    }
    const g = gesture.current
    if (!g) {
      if (tool === 'pen' && pen) {
        const raw = toWorld(e.clientX, e.clientY)
        penRaw.current = raw
        setPen((s) => ({ ...s, cursor: e.shiftKey ? snap45(s.points.at(-1), raw) : raw }))
      }
      if (editing) {
        const edge = e.target.closest?.('[data-edge]')?.dataset.edge
        const o = edge != null && objects.find((x) => x.id === editing.id)
        if (o) {
          const pts = absolutePoints(o)
          const i = Number(edge)
          setEdgeHover(projectOnSegment(toWorld(e.clientX, e.clientY), pts[i], pts[(i + 1) % pts.length]))
        } else setEdgeHover(null)
        return
      }
      if (tool === 'select') {
        const id = e.target.closest?.('[data-id]')?.dataset.id ?? null
        setHoverId(armedTier && id && !isAssignable(objects.find((o) => o.id === id) ?? {}) ? null : id)
      }
      return
    }
    if (g.kind === 'pan') {
      setView({ ...g.view, x: g.view.x + e.clientX - g.sx, y: g.view.y + e.clientY - g.sy })
      return
    }
    const p = toWorld(e.clientX, e.clientY)
    let dx = p.x - g.start?.x
    let dy = p.y - g.start?.y
    const far = Math.hypot(dx * view.k, dy * view.k) > 3

    if (g.kind === 'vertex') {
      if (!far && !g.moved) return
      g.moved = true
      const pts = [...g.pts]
      const from = g.pts[g.index]
      let q = { x: from.x + dx, y: from.y + dy }
      if (e.shiftKey) q = snap45(pts[(g.index - 1 + pts.length) % pts.length], q)
      pts[g.index] = q
      scene.preview(g.base.map((o) => (o.id === g.id ? { ...o, ...polygonFrom(pts) } : o)))
      return
    }
    if (g.kind === 'create') {
      if (!far && !g.moved) return
      g.moved = true
      const box = boxFrom(g.start, p, e.shiftKey)
      scene.preview([...g.base, { ...g.obj, ...box }])
    } else if (g.kind === 'move') {
      if (!far && !g.moved) return
      g.moved = true
      if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0)
      scene.preview(g.base.map((o) => (g.ids.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o)))
    } else if (g.kind === 'resize') {
      const sel = g.base.filter((o) => g.ids.has(o.id))
      const keep = e.shiftKey !== (sel.length === 1 && (sel[0].type === 'image' || sel[0].type === 'text'))
      const resized = new Map(resizeObjects(sel, g.box, g.handle, dx, dy, keep).map((o) => [o.id, o]))
      scene.preview(g.base.map((o) => resized.get(o.id) ?? o))
    } else if (g.kind === 'marquee') {
      const box = boxFrom(g.start, p)
      setMarquee(box)
      const hit = objects
        .filter((o) => !isGroup(o) && !flags.hidden.has(o.id) && !flags.locked.has(o.id) && (!armedTier || isAssignable(o)) && intersects(o, box))
        .map((o) => (armedTier ? o.id : chainOf(objects, o.id).at(-1)))
      setSelection([...new Set([...g.keep, ...hit])])
    }
  }

  function onPointerUp(e) {
    const g = gesture.current
    gesture.current = null
    setMarquee(null)
    setPanning(false)
    if (!g) return
    if (g.kind === 'create') {
      let obj
      if (g.moved) {
        obj = latest.current.objects.find((o) => o.id === g.obj.id)
        if (obj && (obj.w < 4 || obj.h < 4)) obj = null
      }
      if (!obj) {
        const [w, h] = defaults[g.obj.type]
        obj = { ...g.obj, x: g.start.x - w / 2, y: g.start.y - h / 2, w, h }
        scene.preview([...g.base, obj])
      }
      scene.commit(g.base)
      setSelection([obj.id])
      if (!e.altKey) setTool('select') // Alt keeps the tool for drawing several in a row
    } else if (g.kind === 'move' || g.kind === 'resize' || g.kind === 'vertex') {
      if (g.kind === 'resize' || g.moved) scene.commit(g.base)
    }
  }

  /* ── Keyboard ───────────────────────────────────────────── */
  useEffect(() => {
    function onKeyDown(e) {
      if (isTyping(e.target) || e.target.closest?.('[role="dialog"], dialog')) return
      // The layers list uses arrows / Enter itself
      if (e.target.closest?.('[role="tree"]') && (e.key.startsWith('Arrow') || e.key === 'Enter')) return
      const { objects: list, selection: sel, pen: p, armedTier: armed, editing: ed } = latest.current
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (e.key === ' ' && !e.repeat) { setSpace(true); e.preventDefault(); return }
      if (e.key === 'Shift' && p && penRaw.current) { setPen((s) => s && { ...s, cursor: snap45(s.points.at(-1), penRaw.current) }); return }
      if (mod && (key === '=' || key === '+')) { e.preventDefault(); return zoomAt(1.25) }
      if (mod && key === '-') { e.preventDefault(); return zoomAt(0.8) }
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); return fit() }
      if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); return setView((v) => ({ ...v, k: 1 })) }
      if (mod && key === 'z') { e.preventDefault(); return e.shiftKey ? scene.redo() : scene.undo() }
      if (mod && key === 'y') { e.preventDefault(); return scene.redo() }
      if (mod && key === 'a') {
        e.preventDefault()
        return setSelection(childrenFront(list, null).filter((id) => !list.find((o) => o.id === id)?.locked && !list.find((o) => o.id === id)?.hidden))
      }
      if (mod && (key === 'c' || key === 'd' || key === 'v')) {
        const snapshot = key === 'v' ? clipboard.current : sel.length ? collect(list, sel) : null
        if (key === 'c') { clipboard.current = snapshot; return }
        if (!snapshot?.items.length) return
        e.preventDefault()
        const { list: next, roots } = pasteItems(list, snapshot)
        if (key === 'v') clipboard.current = collect(next, roots) // the next paste steps on again
        scene.apply(next)
        setSelection(roots)
        return
      }
      if (mod && key === 'g' && sel.length) {
        e.preventDefault()
        if (e.shiftKey) { const r = ungroupItems(list, sel); scene.apply(r.list); return setSelection(r.ids) }
        const r = groupItems(list, sel)
        if (r.id) { scene.apply(r.list); setSelection([r.id]) }
        return
      }
      if (mod && (e.code === 'BracketRight' || e.code === 'BracketLeft') && sel.length) {
        e.preventDefault()
        const dir = e.code === 'BracketRight' ? (e.shiftKey ? 'front' : 'forward') : (e.shiftKey ? 'back' : 'backward')
        return scene.apply(restack(list, sel, dir))
      }
      if (mod && e.shiftKey && (key === 'h' || key === 'l') && sel.length) {
        e.preventDefault()
        const prop = key === 'h' ? 'hidden' : 'locked'
        const items = outermost(list, sel)
        const on = !items.every((id) => list.find((o) => o.id === id)?.[prop])
        scene.apply((l) => l.map((o) => (items.includes(o.id) ? { ...o, [prop]: on } : o)))
        if (prop === 'locked' && on) setSelection([])
        return
      }
      if (mod) return

      if (p && e.key === 'Enter') return finishPen()
      if (!ed && e.key === 'Enter' && sel.length === 1) {
        const o = list.find((x) => x.id === sel[0])
        if (o && (isAssignable(o) || o.type === 'text')) { e.preventDefault(); return setLabelEdit({ id: o.id, base: list }) }
      }
      if (ed) {
        const o = list.find((x) => x.id === ed.id)
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); return setEditing(null) }
        if (o && ed.active != null && (e.key === 'Delete' || e.key === 'Backspace')) {
          e.preventDefault()
          const pts = absolutePoints(o)
          if (pts.length <= 3) return // a shape needs three points
          pts.splice(ed.active, 1)
          scene.apply((l) => l.map((x) => (x.id === o.id ? { ...x, ...polygonFrom(pts) } : x)))
          return setEditing({ id: o.id, active: null })
        }
        if (o && ed.active != null && e.key.startsWith('Arrow')) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const pts = absolutePoints(o)
          const v = pts[ed.active]
          pts[ed.active] = { x: v.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), y: v.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0) }
          return scene.apply((l) => l.map((x) => (x.id === o.id ? { ...x, ...polygonFrom(pts) } : x)))
        }
        if (e.key === 'Delete' || e.key === 'Backspace' || e.key.startsWith('Arrow')) { e.preventDefault(); return }
      }
      if (e.key === 'Escape') {
        if (p) return setPen(null)
        if (armed) return onDisarm()
        if (sel.length) return setSelection([])
        return setTool('select')
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (p) { setPen((s) => (s.points.length > 1 ? { ...s, points: s.points.slice(0, -1) } : null)); return }
        if (!sel.length) return
        e.preventDefault()
        scene.apply((l) => removeItems(l, sel))
        setSelection([])
        return
      }
      if (e.key.startsWith('Arrow') && sel.length) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const leaves = leafIds(list, sel)
        scene.apply((l) => l.map((o) => (leaves.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o)))
      }
    }
    function onKeyUp(e) {
      if (e.key === ' ') setSpace(false)
      if (e.key === 'Shift' && latest.current.pen && penRaw.current) setPen((s) => s && { ...s, cursor: penRaw.current })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [scene, setSelection, setTool, onDisarm, finishPen, fit, zoomAt])

  // Leaving the pen tool drops an unfinished path.
  useEffect(() => { if (tool !== 'pen') setPen(null) }, [tool])

  // Point editing ends when its shape is deselected, deleted (or undone away), or a tool/tier takes over.
  const editingValid = editing && tool === 'select' && !armedTier && selection.length === 1 && selection[0] === editing.id && objects.some((o) => o.id === editing.id)
  useEffect(() => { if (editing && !editingValid) { setEditing(null); setEdgeHover(null) } }, [editing, editingValid])

  /* ── Render ─────────────────────────────────────────────── */
  const k = view?.k ?? 1
  const tx = view?.x ?? 0
  const ty = view?.y ?? 0
  const screen = (b) => ({ x: b.x * k + tx, y: b.y * k + ty, w: b.w * k, h: b.h * k })
  const accent = armedTier?.color ?? SELECT
  const gridAlpha = Math.round(Math.min(1, Math.max(0, (k - GRID_FROM) / (GRID_FULL - GRID_FROM))) * 0.08 * 1000) / 1000

  /** Fill to paint, or 'none' when it's removed / hidden. Tier colour wins (and previews while assigning). */
  function fillOf(o) {
    if (armedTier && (selection.includes(o.id) || hoverId === o.id) && o.type !== 'text' && o.type !== 'image') return armedTier.color
    if (o.tierId && tierById[o.tierId]) return tierById[o.tierId].color
    if (o.fill === null || o.fillHidden) return 'none'
    return o.fill || (o.type === 'text' ? '#0A0A0A' : DEFAULT_FILL)
  }


  const sb = selectedBox && screen(selectedBox)
  const cursor = panning ? 'grabbing' : space ? 'grab' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair'

  return (
    <div
      ref={wrapRef}
      tabIndex={-1}
      role="application"
      aria-roledescription="Seating canvas"
      aria-label={armedTier ? `Canvas — assigning ${armedTier.name}. Click sections or drag to select several.` : 'Canvas'}
      className="seat-canvas relative min-h-100 flex-1 overflow-hidden border-y border-default outline-none lg:min-h-0 lg:border-y-0"
      style={{
        backgroundColor: background,
        cursor,
      }}
      data-armed={armedTier ? true : undefined}
      onPointerEnter={() => setChipVisible(true)}
      onPointerLeave={() => { setChipVisible(false); setHoverId(null) }}
      onDragOver={(e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault() }}
      onDrop={(e) => {
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        e.preventDefault()
        addImage(file, toWorld(e.clientX, e.clientY))
      }}
    >
      {view && (
        <svg
          className="absolute inset-0 size-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(e) => {
            if (tool === 'pen') return finishPen()
            if (tool !== 'select' || armedTier || editing) return
            // Pointer capture from the first click retargets dblclick to the <svg> — look up what's under the pointer.
            const id = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]')?.dataset.id
            if (!id) return
            // A group is selected → go one level into it
            const chain = chainOf(objects, id)
            const inside = selection.length === 1 && chain.indexOf(selection[0]) > 0
            if (inside) return setSelection([chain[chain.indexOf(selection[0]) - 1]])
            if (selection.length === 1 && selection[0] !== id) return
            const target = objects.find((o) => o.id === id)
            if (target?.type === 'text') { e.preventDefault(); setSelection([id]); return setLabelEdit({ id, base: objects }) }
            if (!isPathEditable(target)) return
            // Points are edited unrotated — fold any rotation / flip into them first.
            if (target.rotation || target.flipX || target.flipY) scene.apply((list) => list.map((o) => (o.id === id ? bakeTransform(o) : o)))
            setSelection([id])
            setEditing({ id, active: null })
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <g transform={`translate(${tx} ${ty}) scale(${k})`}>
            {objects.map((o) => (isGroup(o) || flags.hidden.has(o.id) ? null : (
              <SceneObject
                key={o.id}
                o={o}
                fill={fillOf(o)}
                preview={Boolean(armedTier && hoverId === o.id && !selection.includes(o.id))}
                lockedDeep={flags.locked.has(o.id)}
                editingText={labelEdit?.id === o.id}
              />
            )))}
            {pen && (
              <polyline
                points={[...pen.points, pen.cursor].map((q) => `${q.x},${q.y}`).join(' ')}
                fill="rgb(43 127 255 / 0.08)" stroke={SELECT} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none"
              />
            )}
          </g>

          {/* Overlay in screen space so outlines and handles keep their size at any zoom */}
          <g pointerEvents="none">
            {hoverId && !selection.includes(hoverId) && !armedTier && !editing && (() => {
              const o = objects.find((x) => x.id === hoverId)
              if (!o) return null
              const s = screen(o)
              return <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke={SELECT} strokeWidth={1} transform={screenRotation(o, s)} />
            })()}
            {selected.map((o) => {
              // Shapes picked through a group are outlined by the group's box only (as in Figma)
              if (editing?.id === o.id || labelEdit?.id === o.id || !selection.includes(o.id)) return null
              const s = screen(o)
              return <rect key={o.id} x={s.x - 0.5} y={s.y - 0.5} width={s.w + 1} height={s.h + 1} fill="none" stroke={accent} strokeWidth={selected.length > 1 ? 1 : 1.5} transform={screenRotation(o, s)} />
            })}
            {selectedGroups.map((gr) => {
              const b = boundsOf(objects.filter((o) => leafIds(objects, [gr.id]).has(o.id)))
              if (!b) return null
              const s = screen(b)
              return <rect key={gr.id} x={s.x - 0.5} y={s.y - 0.5} width={s.w + 1} height={s.h + 1} fill="none" stroke={SELECT} strokeWidth={1.5} />
            })}
            {highlight.length > 0 && (() => {
              const lit = objects.filter((o) => leafIds(objects, highlight).has(o.id) && !flags.hidden.has(o.id))
              const b = boundsOf(lit)
              if (!b) return null
              const s = screen(b)
              return <rect x={s.x - 0.5} y={s.y - 0.5} width={s.w + 1} height={s.h + 1} fill="none" stroke={SELECT} strokeWidth={1.5} />
            })()}
            {sb && selected.length > 1 && !armedTier && !(selection.length === 1 && selectedGroups.length === 1) && <rect x={sb.x - 4} y={sb.y - 4} width={sb.w + 8} height={sb.h + 8} fill="none" stroke={SELECT} strokeDasharray="4 3" />}
            {pen?.points.map((q, i) => (
              <circle key={i} cx={q.x * k + tx} cy={q.y * k + ty} r={i === 0 ? 5 : 3.5} fill="#fff" stroke={SELECT} strokeWidth={1.5} />
            ))}
            {marquee && (() => {
              const s = screen(marquee)
              return <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={`${accent}14`} stroke={accent} strokeWidth={1} className="seat-marquee" />
            })()}
          </g>
          {editing && (() => {
            const o = objects.find((x) => x.id === editing.id)
            if (!o) return null
            const pts = absolutePoints(o).map((q) => ({ x: q.x * k + tx, y: q.y * k + ty }))
            return (
              <g>
                <polygon points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" stroke={SELECT} strokeWidth={1.5} pointerEvents="none" />
                {pts.map((a, i) => {
                  const b = pts[(i + 1) % pts.length]
                  return <line key={`e${i}`} data-edge={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} style={{ cursor: 'copy' }} />
                })}
                {edgeHover && (
                  <circle cx={edgeHover.x * k + tx} cy={edgeHover.y * k + ty} r={4} fill="#fff" stroke={SELECT} strokeWidth={1.5} pointerEvents="none" className="seat-ghost-point" />
                )}
                {pts.map((q, i) => (
                  <circle
                    key={`v${i}`} data-vertex={i} cx={q.x} cy={q.y} r={editing.active === i ? 5 : 4.5}
                    fill={editing.active === i ? SELECT : '#fff'} stroke={SELECT} strokeWidth={1.5} style={{ cursor: 'move' }}
                    className="seat-point"
                  />
                ))}
              </g>
            )
          })()}
          {sb && !armedTier && tool === 'select' && !marquee && !editing && !labelEdit && selected.every((o) => !o.rotation) && (
            <g>
              {handles.map((h) => {
                const hx = sb.x + (h.includes('w') ? 0 : h.includes('e') ? sb.w : sb.w / 2)
                const hy = sb.y + (h.includes('n') ? 0 : h.includes('s') ? sb.h : sb.h / 2)
                return (
                  <rect
                    key={h} data-handle={h}
                    x={hx - HANDLE / 2} y={hy - HANDLE / 2} width={HANDLE} height={HANDLE} rx={1.5}
                    fill="#fff" stroke={SELECT} strokeWidth={1.25} style={{ cursor: handleCursor[h] }}
                  />
                )
              })}
            </g>
          )}
        </svg>
      )}

      {/* Pixel grid — over the shapes (as in Figma) so it reads even when zoomed inside one */}
      {gridAlpha > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(0 0 0 / ${gridAlpha}) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / ${gridAlpha}) 1px, transparent 1px)`,
            backgroundSize: `${k}px ${k}px`,
            backgroundPosition: `${tx}px ${ty}px`,
          }}
        />
      )}

      {/* Figma "Tooltip" — black pill above the selection while assigning */}
      {armedTier && sb && !marquee && (
        <div className="seat-tooltip pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center drop-shadow-[0_12px_8px_rgb(16_24_40/0.08)]" style={{ left: sb.x + sb.w / 2, top: sb.y - 6 }}>
          <span className="rounded-md bg-black px-2 py-1 text-label whitespace-nowrap text-white">
            {selected.length > 1 ? `${selected.length} Selected` : 'Selected'}
          </span>
          <img src={tooltipArrow} alt="" width="16" height="6" className="-mt-px h-1.5 w-4" />
        </div>
      )}

      {/* Assign chip — follows the pointer */}
      {armedTier && (
        <div ref={chipRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10" style={{ transform: 'translate(-999px, -999px)' }}>
          <span key={armedTier.id} className="seat-chip flex items-center gap-1.5 rounded-full border border-black/10 bg-white py-1 pr-2.5 pl-1.5 text-caption font-medium whitespace-nowrap text-black shadow-[0_4px_12px_-2px_rgb(0_0_0/0.12),0_1px_2px_rgb(0_0_0/0.06)]" data-visible={chipVisible || undefined}>
            <span className="size-3 rounded-full ring-2 ring-white" style={{ backgroundColor: armedTier.color }} />
            {armedTier.name}
          </span>
        </div>
      )}

      {labelEdit && view && (() => {
        const o = objects.find((x) => x.id === labelEdit.id)
        if (!o) return null
        const finishText = () => {
          const current = latest.current.objects.find((x) => x.id === o.id)
          if (!current?.text?.trim()) {
            scene.preview(labelEdit.base.filter((x) => x.id !== o.id)) // empty text is removed (as in Figma)
            if (labelEdit.base.some((x) => x.id === o.id)) scene.commit(labelEdit.base)
            setSelection([])
          } else scene.commit(labelEdit.base)
          setLabelEdit(null)
          wrapRef.current?.focus({ preventScroll: true })
        }
        if (o.type === 'text') {
          return (
            <TextEditor
              key={o.id}
              object={o}
              left={o.x * k + tx}
              top={o.y * k + ty}
              k={k}
              onChange={(text) => scene.preview((list) => list.map((x) => {
                if (x.id !== o.id) return x
                const w = text ? measureText(text, x.fontSize) : 0
                const shift = x.textAlign === 'center' ? (x.w - w) / 2 : x.textAlign === 'right' ? x.w - w : 0
                return { ...x, text, w, x: x.x + shift }
              }))}
              onDone={finishText}
            />
          )
        }
        const fill = fillOf(o)
        return (
          <LabelEditor
            key={o.id}
            object={o}
            left={((o.labelAlign ?? 'center') === 'center' ? o.x + (o.labelX ?? 0.5) * o.w : o.x + o.w / 2) * k + tx}
            align={o.labelAlign ?? 'center'}
            top={(o.y + (o.labelY ?? 0.5) * o.h) * k + ty}
            width={(o.labelAlign ?? 'center') === 'center' ? Math.max(64, o.w * k) : Math.max(24, (o.w - 2 * Math.min(8, o.w * 0.08)) * k)}
            fontSize={labelFontSize({ ...o, name: o.name || 'Label' }) * k}
            color={o.labelColor ?? autoLabelColor(fill)}
            rotation={o.rotation}
            onChange={(name) => scene.preview((list) => list.map((x) => (x.id === o.id ? { ...x, name } : x)))}
            onDone={() => {
              scene.commit(labelEdit.base)
              setLabelEdit(null)
              wrapRef.current?.focus({ preventScroll: true })
            }}
          />
        )
      })()}

      {editing && (
        <p className="seat-edit-hint pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-3 py-1.5 text-caption whitespace-nowrap text-white shadow-[0_4px_12px_-2px_rgb(0_0_0/0.2)]">
          Drag a point · click an edge to add one · <kbd className="font-sans font-medium">Del</kbd> removes · <kbd className="font-sans font-medium">Esc</kbd> done
        </p>
      )}

      {!objects.length && !pen && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-body text-pretty text-fg-muted">
          Pick a tool on the right to draw, or drop a venue plan here to trace over.
        </p>
      )}

      {/* Zoom — bottom right */}
      {view && (
        <div className="absolute right-3 bottom-3 flex items-center rounded-lg border border-black/10 bg-white p-0.5 text-black shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-4px_rgb(0_0_0/0.1)]">
          <ZoomButton label="Zoom out (⌘−)" onClick={() => zoomAt(0.8)}><Minus className="size-3.5" /></ZoomButton>
          <button type="button" onClick={() => setView((v) => ({ ...v, k: 1 }))} title="Reset to 100% (Shift+0)" className="seat-zoom h-7 w-13 cursor-pointer rounded-md text-caption font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
            {Math.round(k * 100)}%
          </button>
          <ZoomButton label="Zoom in (⌘+)" onClick={() => zoomAt(1.25)}><Plus className="size-3.5" /></ZoomButton>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-black/10" />
          <ZoomButton label="Zoom to fit (Shift+1)" onClick={() => fit()}><Maximize className="size-3.5" /></ZoomButton>
        </div>
      )}
    </div>
  )
}

/** Turns a screen-space outline with its object (rotation about the centre). */
function screenRotation(o, s) {
  return o.rotation ? `rotate(${o.rotation} ${s.x + s.w / 2} ${s.y + s.h / 2})` : undefined
}

/**
 * Pen + Shift: keep the segment from `a` straight — the nearest of 0°, 45°, 90°… The pointer
 * is projected onto that direction, so a horizontal line ends right under the cursor's x.
 */
function snap45(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  const ux = Math.round(Math.cos(angle) * 1e6) / 1e6
  const uy = Math.round(Math.sin(angle) * 1e6) / 1e6
  const t = (dx * ux + dy * uy) / (ux * ux + uy * uy)
  return { x: a.x + ux * t, y: a.y + uy * t }
}

/**
 * One drawable, memoised: panning / zooming only moves the world <g>, so thousands of seats don't
 * re-render — an object re-renders only when it, its paint or its state changes.
 */
const SceneObject = memo(function SceneObject({ o, fill, preview, lockedDeep, editingText }) {
  const id = lockedDeep ? undefined : o.id
  const flipped = transformOf(o)
  const opacity = objectOpacity(o)
  let shape
  if (o.type === 'image') {
    shape = <image data-id={id} href={o.src} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none" style={{ pointerEvents: lockedDeep ? 'none' : 'auto' }} />
  } else if (o.type === 'text') {
    if (editingText) return null // the in-place editor draws it meanwhile
    const t = textAnchorX(o)
    shape = <text data-id={id} x={t.x} textAnchor={t.anchor} y={o.y} fontSize={o.fontSize} fontWeight={500} fill={fill} fillOpacity={o.fillOpacity ?? 1} dominantBaseline="text-before-edge" className="select-none">{o.text}</text>
  } else if (o.dots) {
    // Seat map: a transparent hull takes clicks; the seats are one path of dots in the fill colour
    shape = (
      <>
        <path data-id={id} d={hullPath(o)} fill="transparent" stroke="none" />
        <path d={dotsD(o)} fill={fill === 'none' ? DEFAULT_FILL : fill} fillOpacity={(o.tierId ? 1 : o.fillOpacity ?? 1) * (preview ? 0.55 : 1)} pointerEvents="none" className="seat-obj" />
      </>
    )
  } else {
    // Stroke in world units (scales with zoom). SVG only strokes on the centre line, so
    // inside = double width clipped to the shape; outside = double width painted under the fill.
    const st = strokeOf(o)
    const geometry = (props) => (o.type === 'ellipse'
      ? <ellipse {...props} cx={o.x + o.w / 2} cy={o.y + o.h / 2} rx={o.w / 2} ry={o.h / 2} />
      : o.points
        ? <path {...props} d={polygonPath(o)} />
        : o.path
          ? <path {...props} d={pathD(o)} />
        : <rect {...props} x={o.x} y={o.y} width={o.w} height={o.h} rx={cornerRadius(o)} />)
    const common = {
      'data-id': id, fill,
      fillOpacity: (fill === 'none' ? 1 : (o.tierId ? 1 : o.fillOpacity ?? 1)) * (preview ? 0.55 : 1),
      stroke: st.visible ? st.color : 'none',
      strokeOpacity: o.strokeOpacity ?? 1,
      strokeWidth: st.position === 'center' ? st.width : st.width * 2,
      ...(st.position === 'outside' && { paintOrder: 'stroke' }),
      ...(st.position === 'inside' && { clipPath: `url(#clip-${o.id})` }),
      className: 'seat-obj',
    }
    shape = (
      <>
        {st.position === 'inside' && <clipPath id={`clip-${o.id}`}>{geometry({})}</clipPath>}
        {geometry(common)}
      </>
    )
  }
  const label = o.type !== 'text' && o.type !== 'image' && o.name
  const size = labelFontSize(o)
  return (
    <g key={o.id} opacity={opacity}>
      <g transform={flipped}>{shape}</g>
      {label && !editingText && (
        // Labels turn with the shape but never mirror
        <text
          transform={o.rotation ? `rotate(${o.rotation} ${o.x + o.w / 2} ${o.y + o.h / 2})` : undefined}
          // labelX/labelY (0…1 in the box) place the number off-centre where a shape's middle is a notch
          x={labelAnchorX(o).x} y={o.y + (o.labelY ?? 0.5) * o.h} fontSize={size} fontWeight={500} textAnchor={labelAnchorX(o).anchor} dominantBaseline="central"
          fill={o.labelColor ?? autoLabelColor(fill)} pointerEvents="none" className="select-none"
        >
          {label}
        </text>
      )}
    </g>
  )
})

/**
 * In-place label input: sits on the label, same size and colour at the current zoom, so typing
 * looks like editing the canvas text. Enter / click away commits (one undo step), Esc cancels.
 */
function LabelEditor({ object, left, top, width, fontSize, color, rotation, align = 'center', onChange, onDone }) {
  const ref = useRef(null)
  const done = useRef(false)
  useLayoutEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const finish = (cancel) => { if (done.current) return; done.current = true; onDone(cancel) }
  return (
    <input
      ref={ref}
      aria-label="Text in shape"
      defaultValue={object.name ?? ''}
      placeholder="Type text"
      maxLength={40}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => finish(false)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' || e.key === 'Escape') finish(false) // Esc finishes, as in Figma
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="seat-label-input absolute z-10 rounded-xs border-0 bg-transparent p-0 font-medium outline-1 outline-offset-2 outline-[#2B7FFF] placeholder:text-current placeholder:opacity-50"
      style={{ left, top, width, textAlign: align, fontSize: Math.max(10, fontSize), lineHeight: 1.2, color, transform: `translate(-50%, -50%)${rotation ? ` rotate(${rotation}deg)` : ''}` }}
    />
  )
}

/**
 * In-place editor for a text object: a borderless input over the text's own box — same font,
 * size and colour at the current zoom — so it reads as typing on the canvas, caret blinking.
 * It grows with what's typed (the object's width is re-measured on every change).
 */
function TextEditor({ object, left, top, k, onChange, onDone }) {
  const ref = useRef(null)
  const done = useRef(false)
  useLayoutEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const finish = () => { if (done.current) return; done.current = true; onDone() }
  const size = object.fontSize * k
  const placeholderW = measureText('Type something', object.fontSize) * k
  return (
    <input
      ref={ref}
      aria-label="Text"
      defaultValue={object.text ?? ''}
      placeholder="Type something"
      maxLength={120}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter' || e.key === 'Escape') finish()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="seat-text-input absolute z-10 border-0 bg-transparent p-0 font-medium outline-1 outline-offset-1 outline-[#2B7FFF] placeholder:text-current placeholder:opacity-40"
      style={{
        left: left - (object.text ? 0 : ({ center: placeholderW / 2, right: placeholderW }[object.textAlign] ?? 0)), top,
        width: Math.max(object.text ? object.w * k + 2 : placeholderW + 2, 4),
        height: object.h * k,
        fontSize: size, lineHeight: `${object.h * k}px`,
        color: object.fill ?? '#0A0A0A', opacity: (object.fillOpacity ?? 1) * (object.opacity ?? 1),
        caretColor: '#2B7FFF',
        textAlign: object.textAlign ?? 'left',
        transform: object.rotation ? `rotate(${object.rotation}deg)` : undefined,
        transformOrigin: 'center',
      }}
    />
  )
}

function ZoomButton({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="seat-zoom flex size-7 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
      {children}
    </button>
  )
}

export default SeatCanvas
