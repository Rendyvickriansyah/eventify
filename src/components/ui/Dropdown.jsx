import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePortalContainer } from '@/lib/usePortalContainer'
import { useDismiss } from '@/hooks/useDismiss'
import chevronDown from '@/assets/icons/chevron-down.svg'
import { Icon } from './Icon'

/**
 * Filter dropdown — Figma "Dropdown / _Dropdown Base"; the option list uses the shared
 * dark glass surface (`.menu-surface`, see Menu.jsx). The list is portalled to <body> and
 * fixed under the trigger: backdrop blur only samples what's behind it inside its own
 * backdrop root, and the toolbar sits outside the scrolling <main> it overlaps.
 * Trigger: white, black/10 border, radius 12, 12/8 padding, 14/20 text + 16px chevron.
 * Shows `label` until an option is chosen.
 *
 * @param {{
 *   label: string,
 *   options: { value: string, label: string }[],
 *   value?: string | null,
 *   onChange?: (value: string | null) => void,
 *   align?: 'start' | 'end',
 *   className?: string,
 * }} props
 */
export function Dropdown({ label, options = [], value = null, onChange, align = 'end', className, ...props }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const portalTarget = usePortalContainer(triggerRef)
  const listRef = useRef(null)
  const listId = useId()

  const [position, setPosition] = useState({})
  const close = useCallback(() => setOpen(false), [])
  useDismiss([rootRef, listRef], open, close)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition(
      align === 'end'
        ? { top: rect.bottom + 8, right: window.innerWidth - rect.right, minWidth: rect.width }
        : { top: rect.bottom + 8, left: rect.left, minWidth: rect.width },
    )
  }, [open, align])

  // A fixed popover would drift away from its trigger on scroll / resize.
  useEffect(() => {
    if (!open) return
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) close() }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  const selected = options.find((o) => o.value === value)

  const focusOption = (index) => {
    const items = listRef.current?.querySelectorAll('[role="option"]')
    if (!items?.length) return
    items[(index + items.length) % items.length].focus()
  }

  const openAndFocus = (index = 0) => {
    setOpen(true)
    requestAnimationFrame(() => focusOption(index))
  }

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      openAndFocus(e.key === 'ArrowDown' ? 0 : -1)
    }
  }

  const onListKeyDown = (e) => {
    const items = [...(listRef.current?.querySelectorAll('[role="option"]') ?? [])]
    const current = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); focusOption(current + 1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusOption(current - 1) }
    if (e.key === 'Home') { e.preventDefault(); focusOption(0) }
    if (e.key === 'End') { e.preventDefault(); focusOption(-1) }
    if (e.key === 'Tab') close()
    if (e.key === 'Escape') triggerRef.current?.focus()
  }

  const choose = (next) => {
    onChange?.(next === value ? null : next)
    close()
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 whitespace-nowrap',
          'rounded-lg border border-default bg-surface py-1.75 pr-1.75 pl-2.75 shadow-control',
          'text-body text-fg transition-colors duration-150 outline-none',
          'hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-primary/20',
          open && 'bg-surface-hover',
        )}
      >
        <span>{selected ? selected.label : label}</span>
        <Icon
          src={chevronDown}
          className={cn('transition-transform duration-150 ease-standard', open && 'rotate-180')}
        />
      </button>

      {open && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKeyDown}
          className={cn(
            'menu-surface menu-in fixed z-[var(--z-dropdown)] w-max max-w-64',
            align === 'end' ? 'origin-top-right' : 'origin-top-left',
          )}
          style={position}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => choose(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(option.value) }
                }}
                className="menu-item justify-between"
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="menu-item-icon" strokeWidth={2.25} aria-hidden />}
              </li>
            )
          })}
        </ul>,
        portalTarget,
      )}
    </div>
  )
}

export default Dropdown
