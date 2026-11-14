import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePortalContainer } from '@/lib/usePortalContainer'
import chevronDown from '@/assets/icons/chevron-down.svg'
import { Icon } from './Icon'

/**
 * Custom select — input-styled trigger (same box as TextInput/Select in Field.jsx) that opens
 * the dark frosted-glass list used by Menu (`.menu-surface`), with an optional icon per option.
 * Use it where the option list should look like the app's menus; a native <select> can't be
 * styled. Implements the ARIA select-only combobox pattern:
 * ↓/↑/Enter/Space/Alt+↓ open · ↓/↑/Home/End move · Enter/Space/Tab pick · Esc closes ·
 * typing a letter jumps to the next option starting with it.
 *
 * @param {{
 *   id?: string, name?: string, value: string, onChange: (value: string) => void,
 *   options: { value: string, label: string, icon?: React.ComponentType<{ className?: string }> }[],
 *   placeholder?: string, invalid?: boolean, className?: string,
 *   'aria-describedby'?: string,
 * }} props
 */
export function SelectMenu({ id, name, value, onChange, options, placeholder = 'Select…', invalid, className, ...aria }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [position, setPosition] = useState({})
  const triggerRef = useRef(null)
  const portalTarget = usePortalContainer(triggerRef)
  const listRef = useRef(null)
  const listId = useId()
  const typeahead = useRef({ text: '', timer: 0 })

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]

  const close = useCallback(() => setOpen(false), [])

  function show(index = selectedIndex >= 0 ? selectedIndex : 0) {
    setActive(index)
    setOpen(true)
  }

  function pick(index) {
    const option = options[index]
    if (option) onChange(option.value)
    close()
  }

  // Anchor under the trigger; flip above when there isn't room below.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const height = listRef.current?.offsetHeight ?? 0
    const below = window.innerHeight - rect.bottom
    const up = below < height + 16 && rect.top > below
    setPosition(
      up
        ? { bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, transformOrigin: 'bottom left' }
        : { top: rect.bottom + 6, left: rect.left, width: rect.width, transformOrigin: 'top left' },
    )
  }, [open])

  // Keep the active option in view.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  // Outside press, scroll and resize dismiss (the list is fixed-positioned).
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (!triggerRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close()
    }
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) close() }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  function onKeyDown(e) {
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show(e.key === 'ArrowUp' && selectedIndex < 0 ? last : undefined)
      } else if (e.key.length === 1) jump(e.key)
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, last)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(last) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active) }
    else if (e.key === 'Tab') pick(active)
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key.length === 1) jump(e.key)
  }

  function jump(char) {
    const t = typeahead.current
    clearTimeout(t.timer)
    t.text += char.toLowerCase()
    t.timer = setTimeout(() => { t.text = '' }, 500)
    const from = open ? active : selectedIndex
    const order = [...options.slice(from + 1), ...options.slice(0, from + 1)]
    const match = order.find((o) => o.label.toLowerCase().startsWith(t.text)) ?? order.find((o) => o.label.toLowerCase().startsWith(char.toLowerCase()))
    if (!match) return
    const index = options.indexOf(match)
    if (open) setActive(index)
    else onChange(match.value)
  }

  const SelectedIcon = selected?.icon

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-default bg-surface pr-3 pl-2.75 text-left text-body outline-none',
          'transition-[border-color,box-shadow] duration-150 ease-out hover:border-strong pointer-coarse:text-base',
          'focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
          'aria-invalid:border-danger aria-invalid:hover:border-danger aria-invalid:focus-visible:ring-danger/20',
          open && 'border-primary ring-4 ring-primary/20',
          className,
        )}
        {...aria}
      >
        {SelectedIcon && <SelectedIcon aria-hidden className="size-4 shrink-0 text-fg-muted" strokeWidth={2} />}
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-fg' : 'text-fg-subtle')}>{selected?.label ?? placeholder}</span>
        <Icon src={chevronDown} className="menu-chevron" data-open={open || undefined} />
      </button>
      {name && <input type="hidden" name={name} value={value} />}

      {createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          inert={!open}
          data-open={open || undefined}
          className="menu-pop menu-surface fixed z-[var(--z-dropdown)] max-h-80 overflow-y-auto"
          style={position}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                data-active={i === active || undefined}
                onPointerMove={() => setActive(i)}
                onPointerDown={(e) => e.preventDefault() /* keep focus on the trigger */}
                onClick={() => { pick(i); triggerRef.current?.focus() }}
                className="menu-item"
              >
                {option.icon && <option.icon aria-hidden className="menu-item-icon" strokeWidth={2} />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <Check aria-hidden className="menu-item-icon" strokeWidth={2.25} />}
              </li>
            )
          })}
        </ul>,
        portalTarget,
      )}
    </>
  )
}

export default SelectMenu
