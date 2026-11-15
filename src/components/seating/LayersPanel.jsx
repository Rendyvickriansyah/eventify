import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Circle, Eye, EyeOff, Group, Image, LayoutGrid, Lock, LockOpen, Spline, Square, Type } from 'lucide-react'
import { cn } from '@/lib/cn'
import { chainOf, childrenFront, isGroup, layerName, moveItems } from './layers'

/*
 * Layers tab — Figma's layer list for the seating canvas.
 *  - Front-most first; groups indent their children and fold with the chevron.
 *  - Click selects (⇧ range, ⌘/Ctrl toggle); hovering a row outlines it on the canvas.
 *  - Double-click (or Enter) renames. Eye hides, padlock locks — both show on hover and stay
 *    visible while on, as in Figma.
 *  - Drag rows to restack; drop on the middle of a group row to put layers inside it.
 *  - ↑/↓ move through the list; Delete, ⌘G etc. are handled by the canvas shortcuts.
 */

const icons = { rect: Square, ellipse: Circle, polygon: Spline, section: LayoutGrid, text: Type, image: Image, group: Group }
const INDENT = 16

/**
 * @param {{
 *   objects: import('./geometry').SceneObject[],
 *   selection: string[], setSelection: (ids: string[]) => void,
 *   scene: ReturnType<typeof import('./useScene').useScene>,
 *   onHover: (ids: string[]) => void,
 * }} props
 */
export function LayersPanel({ objects, selection, setSelection, scene, onHover }) {
  const [expanded, setExpanded] = useState(() => new Set()) // groups start folded, as in Figma
  const [renaming, setRenaming] = useState(null)
  const [drag, setDrag] = useState(null) // { ids, over: { id, position } | null }
  const anchor = useRef(null)
  const rowRefs = useRef({})

  // Visible rows, depth-first, front-most first
  const rows = useMemo(() => {
    const out = []
    const walk = (parent, depth) => {
      for (const id of childrenFront(objects, parent)) {
        const o = objects.find((x) => x.id === id)
        out.push({ o, depth })
        if (isGroup(o) && expanded.has(id)) walk(id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  }, [objects, expanded])

  // Selecting something inside a folded group (e.g. on the canvas) unfolds it.
  useEffect(() => {
    const open = new Set()
    for (const id of selection) for (const a of chainOf(objects, id).slice(1)) if (!expanded.has(a)) open.add(a)
    if (open.size) setExpanded((c) => new Set([...c, ...open]))
  }, [selection, objects, expanded])

  const selected = new Set(selection)
  const inSelectedGroup = (id) => chainOf(objects, id).slice(1).some((a) => selected.has(a))

  function select(e, id) {
    if (e.shiftKey && anchor.current) {
      const ids = rows.map((r) => r.o.id)
      const [a, b] = [ids.indexOf(anchor.current), ids.indexOf(id)].sort((x, y) => x - y)
      if (a >= 0) return setSelection(ids.slice(a, b + 1))
    }
    anchor.current = id
    if (e.metaKey || e.ctrlKey) return setSelection(selected.has(id) ? selection.filter((x) => x !== id) : [...selection, id])
    setSelection([id])
  }

  // Locked layers stay selectable from this list (not on the canvas), as in Figma.
  function toggle(o, prop) {
    scene.apply((list) => list.map((x) => (x.id === o.id ? { ...x, [prop]: !o[prop] } : x)))
  }

  function rename(o, value) {
    setRenaming(null)
    const name = value.trim()
    if (!name || name === layerName(o)) return
    scene.apply((list) => list.map((x) => (x.id === o.id ? { ...x, layerName: name } : x)))
  }

  function dropPosition(e, o) {
    const r = e.currentTarget.getBoundingClientRect()
    const f = (e.clientY - r.top) / r.height
    if (isGroup(o)) return f < 0.25 ? 'above' : f > 0.75 ? 'below' : 'inside'
    return f < 0.5 ? 'above' : 'below'
  }

  function onKeyDown(e, i) {
    const o = rows[i].o
    if (renaming) return
    if (e.key === 'Enter') { e.preventDefault(); return setRenaming(o.id) }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = rows[i + (e.key === 'ArrowDown' ? 1 : -1)]
      if (!next) return
      select({ shiftKey: e.shiftKey }, next.o.id)
      rowRefs.current[next.o.id]?.focus()
    }
    if (isGroup(o) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault()
      setExpanded((c) => { const n = new Set(c); e.key === 'ArrowLeft' ? n.delete(o.id) : n.add(o.id); return n })
    }
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col gap-1 px-6 py-6">
        <p className="text-label text-fg">No layers yet</p>
        <p className="text-body text-pretty text-fg-muted">Draw with the tools on the right — every shape, section and label shows up here.</p>
      </div>
    )
  }

  return (
    <ul role="tree" aria-label="Layers" aria-multiselectable className="flex flex-col py-2" onMouseLeave={() => onHover([])}>
      {rows.map(({ o, depth }, i) => {
        const Icon = icons[o.type] ?? Square
        const isSel = selected.has(o.id)
        const over = drag?.over?.id === o.id ? drag.over.position : null
        const group = isGroup(o)
        return (
          <li
            key={o.id}
            ref={(el) => { rowRefs.current[o.id] = el }}
            role="treeitem"
            aria-level={depth + 1}
            aria-selected={isSel}
            aria-expanded={group ? expanded.has(o.id) : undefined}
            tabIndex={isSel || (!selection.length && i === 0) ? 0 : -1}
            draggable={renaming !== o.id}
            onClick={(e) => select(e, o.id)}
            onDoubleClick={() => setRenaming(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onMouseEnter={() => onHover([o.id])}
            onDragStart={(e) => {
              const ids = isSel ? selection : [o.id]
              setDrag({ ids, over: null })
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', layerName(o))
            }}
            onDragOver={(e) => {
              if (!drag) return
              e.preventDefault()
              const position = dropPosition(e, o)
              if (drag.over?.id !== o.id || drag.over.position !== position) setDrag((d) => ({ ...d, over: { id: o.id, position } }))
            }}
            onDrop={(e) => {
              e.preventDefault()
              // Read the position now — currentTarget is gone once the event finishes
              const position = dropPosition(e, o)
              if (drag) scene.apply((list) => moveItems(list, drag.ids, o.id, position))
              setDrag(null)
            }}
            onDragEnd={() => setDrag(null)}
            data-selected={isSel || undefined}
            data-parent-selected={!isSel && inSelectedGroup(o.id) ? true : undefined}
            data-dragging={drag?.ids.includes(o.id) || undefined}
            data-over={over ?? undefined}
            style={{ '--indent': `${12 + depth * INDENT}px` }}
            className="layer-row group/row relative flex h-8 cursor-default items-center gap-1.5 pr-3 pl-(--indent) text-caption text-fg outline-none select-none"
          >
            {group ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label={expanded.has(o.id) ? 'Collapse group' : 'Expand group'}
                onClick={(e) => { e.stopPropagation(); setExpanded((c) => { const n = new Set(c); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n }) }}
                className="-ml-1 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-xs text-fg-muted hover:text-fg"
              >
                <ChevronRight aria-hidden className={cn('layer-chevron size-3', expanded.has(o.id) && 'rotate-90')} strokeWidth={2} />
              </button>
            ) : (
              <span aria-hidden className="-ml-1 w-4 shrink-0" />
            )}
            <Icon aria-hidden className={cn('size-3.5 shrink-0', o.hidden ? 'text-fg-subtle' : 'text-fg-muted')} strokeWidth={1.75} />
            {renaming === o.id ? (
              <input
                autoFocus
                defaultValue={layerName(o)}
                aria-label="Layer name"
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => rename(o, e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenaming(null)
                }}
                className="h-6 min-w-0 flex-1 rounded-xs border border-primary bg-surface px-1 text-caption text-fg outline-none"
              />
            ) : (
              <span className={cn('min-w-0 flex-1 truncate', group && 'font-medium', o.hidden && 'opacity-40')}>{layerName(o)}</span>
            )}
            <LayerToggle
              label={o.locked ? `Unlock ${layerName(o)}` : `Lock ${layerName(o)}`}
              on={Boolean(o.locked)}
              onClick={() => toggle(o, 'locked')}
              icon={o.locked ? Lock : LockOpen}
            />
            <LayerToggle
              label={o.hidden ? `Show ${layerName(o)}` : `Hide ${layerName(o)}`}
              on={Boolean(o.hidden)}
              onClick={() => toggle(o, 'hidden')}
              icon={o.hidden ? EyeOff : Eye}
            />
          </li>
        )
      })}
    </ul>
  )
}

/** Eye / padlock: hidden until the row is hovered or focused, always shown while on. */
function LayerToggle({ label, on, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'layer-toggle flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-fg-muted outline-none hover:bg-black/5 hover:text-fg dark:hover:bg-white/10',
        on ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
    </button>
  )
}

export default LayersPanel
