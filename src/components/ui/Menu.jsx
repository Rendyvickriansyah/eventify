import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePortalContainer } from '@/lib/usePortalContainer'
import chevronDown from '@/assets/icons/chevron-down-strong.svg'
import chevronSelector from '@/assets/icons/chevron-selector.svg'
import { Icon } from './Icon'

/**
 * Action menu — trigger + a dark frosted-glass popover (`.menu-surface`): 16px radius, 6px
 * inset, white 14/20 rows with a 16px leading icon, hairline separators, and fly-out submenus.
 *
 * The popover is portalled and fixed-positioned under the trigger, so table/card overflow
 * never clips it. It stays mounted while closed so it can animate out; `inert` keeps it out
 * of the tab order and accessibility tree.
 * Keyboard: ↓/↑/Home/End move · Enter/Space activate · → opens a submenu, ← / Esc closes it ·
 * Esc closes the menu · Tab leaves.
 *
 * @typedef {{
 *   id: string, label?: string, onSelect?: () => void,
 *   icon?: React.ComponentType<{ className?: string }>,   // e.g. a lucide icon
 *   disabled?: boolean, tone?: 'danger', checked?: boolean,
 *   items?: MenuItem[],             // submenu
 *   type?: 'separator',
 * }} MenuItem
 * @param {{
 *   label: string,
 *   items: MenuItem[],
 *   triggerLabel?: string,
 *   icon?: string,                  // icon-only trigger (e.g. Figma "More" ⋮); `label` names it
 *   variant?: 'inline' | 'field',   // field = full-width bordered selector (Figma event switcher)
 *   align?: 'end' | 'start',        // start = left-aligned, at least as wide as the trigger
 *   className?: string,
 * }} props
 */
export function Menu({ label, items, triggerLabel, icon, variant = 'inline', align = 'end', className }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({})
  const triggerRef = useRef(null)
  const portalTarget = usePortalContainer(triggerRef)
  const rootId = useId()

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // Anchor under the trigger.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition(
      align === 'start'
        ? { top: rect.bottom + 6, left: rect.left, minWidth: rect.width, maxWidth: Math.max(rect.width, 288), transformOrigin: 'top left' }
        : { top: rect.bottom + 6, right: window.innerWidth - rect.right, transformOrigin: 'top right' },
    )
  }, [open, align])

  // Outside press, scroll and resize dismiss (a fixed popover would otherwise drift).
  useEffect(() => {
    if (!open) return
    const inMenu = (target) => triggerRef.current?.contains(target) || target.closest?.(`[data-menu-root="${rootId}"]`)
    const onPointer = (e) => { if (!inMenu(e.target)) close() }
    const onScroll = (e) => { if (!e.target.closest?.(`[data-menu-root="${rootId}"]`)) close() }
    const onResize = () => close()
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close, rootId])

  const panelRef = useRef(null)
  function openMenu(focusIndex = 0) {
    setOpen(true)
    requestAnimationFrame(() => focusIn(panelRef.current, focusIndex))
  }

  function onTriggerKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      openMenu(e.key === 'ArrowDown' ? 0 : -1)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'press inline-flex cursor-pointer items-center gap-2 text-label whitespace-nowrap text-fg text-shadow-button outline-none',
          'transition-[background-color,transform] duration-150 ease-out focus-visible:ring-4 focus-visible:ring-primary/20',
          icon
            ? 'size-8 justify-center rounded-md hover:bg-surface-muted'
            : variant === 'field'
            ? /* Figma sidebar "Dropdown": white, black/6 border, radius 12, 12 × 10 padding, bevel shadow */
              'w-full rounded-lg border border-black/6 bg-surface px-2.75 py-2.25 shadow-control hover:bg-surface-hover dark:border-default'
            : '-mx-2 h-8 rounded-md px-2 hover:bg-surface-muted',
          open && (variant === 'field' && !icon ? 'bg-surface-hover' : 'bg-surface-muted'),
          className,
        )}
      >
        {icon ? (
          <Icon src={icon} className="size-6" />
        ) : (
          <span className={cn(variant === 'field' && 'min-w-0 flex-1 truncate text-left')}>{triggerLabel}</span>
        )}
        {icon ? null : variant === 'field' ? (
          <Icon src={chevronSelector} />
        ) : (
          <Icon src={chevronDown} className="menu-chevron" data-open={open || undefined} />
        )}
      </button>

      <MenuPanel
        ref={panelRef}
        rootId={rootId}
        container={portalTarget}
        label={label}
        items={items}
        open={open}
        style={position}
        onClose={close}
      />
    </>
  )
}

/* ── Panel (root and submenus) ─────────────────────────────────────────────── */

const enabledItems = (panel) => [...(panel?.querySelectorAll(':scope > [role^="menuitem"]:not([aria-disabled="true"])') ?? [])]
function focusIn(panel, index) {
  const list = enabledItems(panel)
  if (list.length) list[(index + list.length) % list.length].focus()
}

/**
 * @param {{ rootId: string, label: string, items: object[], open: boolean, style: object,
 *           onClose: (restoreFocus?: boolean) => void, onBack?: () => void, ref?: React.Ref<HTMLDivElement> }} props
 */
function MenuPanel({ ref, rootId, container, label, items, open, style, onClose, onBack }) {
  const localRef = useRef(null)
  const [sub, setSub] = useState(null) // { id, style }
  const itemRefs = useRef({})

  const setRefs = (node) => {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  // Closing the menu closes any open submenu with it.
  useEffect(() => { if (!open) setSub(null) }, [open])

  function openSub(item, focus = false) {
    const row = itemRefs.current[item.id]
    if (!row) return
    const rect = row.getBoundingClientRect()
    const width = 224
    const fitsRight = rect.right + 6 + width < window.innerWidth
    setSub({
      id: item.id,
      style: fitsRight
        ? { top: rect.top - 6, left: rect.right + 6, transformOrigin: 'top left' }
        : { top: rect.top - 6, right: window.innerWidth - rect.left + 6, transformOrigin: 'top right' },
    })
    if (focus) requestAnimationFrame(() => requestAnimationFrame(() => focusIn(document.getElementById(`${rootId}-${item.id}`), 0)))
  }

  function onKeyDown(e) {
    if (e.target.closest('[role="menu"]') !== localRef.current) return // handled by a submenu
    const list = enabledItems(localRef.current)
    const current = list.indexOf(document.activeElement)
    const focused = items.find((i) => itemRefs.current[i.id] === document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); focusIn(localRef.current, current + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusIn(localRef.current, current - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusIn(localRef.current, 0) }
    else if (e.key === 'End') { e.preventDefault(); focusIn(localRef.current, -1) }
    else if (e.key === 'ArrowRight' && focused?.items) { e.preventDefault(); openSub(focused, true) }
    else if ((e.key === 'ArrowLeft' || e.key === 'Escape') && onBack) { e.preventDefault(); onBack() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(true) }
    else if (e.key === 'Tab') onClose()
  }

  function activate(item) {
    if (item.disabled) return
    if (item.items) return openSub(item, true)
    onClose(true)
    item.onSelect?.()
  }

  const subItem = items.find((i) => i.id === sub?.id)

  return createPortal(
    <>
      <div
        ref={setRefs}
        role="menu"
        aria-label={label}
        inert={!open}
        data-open={open || undefined}
        data-menu-root={rootId}
        onKeyDown={onKeyDown}
        className="menu-pop menu-surface fixed z-[var(--z-dropdown)] w-max min-w-48 max-w-72"
        style={style}
      >
        {items.map((item) =>
          item.type === 'separator' ? (
            <div key={item.id} role="separator" className="menu-separator" />
          ) : (
            <div
              key={item.id}
              ref={(node) => { itemRefs.current[item.id] = node }}
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              aria-haspopup={item.items ? 'menu' : undefined}
              aria-expanded={item.items ? sub?.id === item.id : undefined}
              aria-disabled={item.disabled || undefined}
              tabIndex={-1}
              data-active={sub?.id === item.id || undefined}
              data-tone={item.tone}
              onClick={() => activate(item)}
              onPointerEnter={() => { if (item.items && !item.disabled) openSub(item); else if (sub) setSub(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(item) }
              }}
              className="menu-item"
            >
              {item.icon && <item.icon aria-hidden className="menu-item-icon" strokeWidth={2} />}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.checked && <Check aria-hidden className="menu-item-icon" strokeWidth={2.25} />}
              {item.items && <ChevronRight aria-hidden className="menu-item-icon -mr-0.5 opacity-80" strokeWidth={2} />}
            </div>
          ),
        )}
      </div>

      {subItem && (
        <SubPanel
          id={`${rootId}-${subItem.id}`}
          rootId={rootId}
          container={container}
          label={subItem.label}
          items={subItem.items}
          style={sub.style}
          onClose={onClose}
          onBack={() => { setSub(null); itemRefs.current[subItem.id]?.focus() }}
        />
      )}
    </>,
    container ?? document.body,
  )
}

/** Submenus mount when opened; one frame later they flip to open so the pop-in transition runs. */
function SubPanel({ id, ...props }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  useLayoutEffect(() => { if (ref.current) ref.current.id = id }, [id])
  return <MenuPanel ref={ref} open={open} {...props} />
}

export default Menu
