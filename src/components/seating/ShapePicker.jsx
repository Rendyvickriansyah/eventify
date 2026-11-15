import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Circle, Diamond, Hexagon, Pentagon, Square, Star, Triangle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDismiss } from '@/hooks/useDismiss'

/*
 * Shape tool with Figma's chevron dropdown: the button draws the current shape; the chevron
 * opens the list (same dark glass as the app's menus). R / O are the rectangle / ellipse keys.
 */

export const shapeKinds = [
  { value: 'rect', label: 'Rectangle', key: 'R', icon: Square },
  { value: 'ellipse', label: 'Ellipse', key: 'O', icon: Circle },
  { value: 'triangle', label: 'Triangle', icon: Triangle },
  { value: 'diamond', label: 'Diamond', icon: Diamond },
  { value: 'pentagon', label: 'Pentagon', icon: Pentagon },
  { value: 'hexagon', label: 'Hexagon', icon: Hexagon },
  { value: 'star', label: 'Star', icon: Star },
]

/**
 * @param {{ kind: string, active: boolean, onPick: (kind: string) => void, className?: string }} props
 *   onPick — selects the Shape tool with that kind (also used by the button itself)
 */
export function ShapePicker({ kind, active, onPick, className }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pos, setPos] = useState(null)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const items = useRef([])
  const current = shapeKinds.find((k) => k.value === kind) ?? shapeKinds[0]
  useDismiss([wrapRef, listRef], open, () => setOpen(false))

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 216) })
    const i = Math.max(0, shapeKinds.findIndex((k) => k.value === kind))
    setActiveIndex(i)
    requestAnimationFrame(() => items.current[i]?.focus())
  }, [open, kind])

  function pick(value) {
    onPick(value)
    setOpen(false)
    wrapRef.current?.querySelector('button')?.focus()
  }

  function onKeyDown(e) {
    const last = shapeKinds.length - 1
    const next = { ArrowDown: activeIndex === last ? 0 : activeIndex + 1, ArrowUp: activeIndex === 0 ? last : activeIndex - 1, Home: 0, End: last }[e.key]
    if (next !== undefined) {
      e.preventDefault()
      setActiveIndex(next)
      items.current[next]?.focus()
    } else if (e.key === 'Tab') setOpen(false)
  }

  const Icon = current.icon
  return (
    <div ref={wrapRef} className={cn('flex shrink-0 items-center', className)}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${current.label} tool`}
        title={`${current.label}${current.key ? ` (${current.key})` : ''}`}
        onClick={() => onPick(kind)}
        className={cn(
          'seat-tool flex size-9 cursor-pointer items-center justify-center rounded-l-md border border-r-0 outline-none focus-visible:z-1 focus-visible:ring-4 focus-visible:ring-primary/20',
          active ? 'border-black/15 bg-surface shadow-xs dark:border-default' : 'border-transparent bg-neutral-100 dark:bg-surface-muted',
        )}
      >
        <Icon aria-hidden className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose shape"
        title="Choose shape"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'seat-tool flex h-9 w-4 cursor-pointer items-center justify-center rounded-r-md border border-l-0 outline-none focus-visible:z-1 focus-visible:ring-4 focus-visible:ring-primary/20',
          active ? 'border-black/15 bg-surface shadow-xs dark:border-default' : 'border-transparent bg-neutral-100 hover:bg-neutral-200 dark:bg-surface-muted',
        )}
      >
        <ChevronDown aria-hidden className="menu-chevron size-3 text-fg-muted" data-open={open || undefined} strokeWidth={2.25} />
      </button>
      {createPortal(
        <div
          ref={listRef}
          role="menu"
          aria-label="Shapes"
          inert={!open}
          data-open={open || undefined}
          onKeyDown={onKeyDown}
          className="menu-pop menu-surface fixed z-[var(--z-dropdown)] w-50 [transform-origin:top_left]"
          style={pos ?? { top: -9999, left: -9999 }}
        >
          {shapeKinds.map((k, i) => (
            <button
              key={k.value}
              ref={(el) => { items.current[i] = el }}
              type="button"
              role="menuitemradio"
              aria-checked={k.value === kind}
              tabIndex={i === activeIndex ? 0 : -1}
              data-active={i === activeIndex || undefined}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => pick(k.value)}
              className="menu-item w-full"
            >
              <k.icon aria-hidden className="menu-item-icon" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate text-left">{k.label}</span>
              {k.key && <kbd className="font-sans text-caption text-white/50">{k.key}</kbd>}
              {k.value === kind && <Check aria-hidden className="menu-item-icon" strokeWidth={2.25} />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default ShapePicker
