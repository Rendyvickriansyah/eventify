import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePortalContainer } from '@/lib/usePortalContainer'
import { Icon } from './Icon'
import calendarIcon from '@/assets/icons/calendar-input.svg'

/*
 * Date picker — input-styled trigger (same box as TextInput / SelectMenu) that opens the dark
 * frosted-glass surface used by Menu and SelectMenu (`.menu-surface`). Layout follows the
 * scheduling reference: month header with ‹ › buttons, Mo–Su week grid (outside days dimmed,
 * a dot under today), an optional 30-minute time column on the right, and a footer with
 * Cancel · the pending date/time · Apply.
 *
 * Picks are drafts until Apply (Enter), so browsing months never changes the form.
 * Keyboard (days): ←/→ day · ↑/↓ week · Home/End week start/end · PageUp/PageDown month ·
 * Enter/Space pick · Esc cancel. Values are "YYYY-MM-DD" and "HH:MM" like native inputs.
 *
 * Motion: the panel pops from the trigger corner (`.menu-pop`); the month grid slides 8px in
 * the direction you paged (`.cal-slide`); the selected day's fill eases in.
 */

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

const pad = (n) => String(n).padStart(2, '0')
const toIso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const fromIso = (s) => (s ? new Date(`${s}T00:00:00Z`) : null)
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "13:30" → "1:30 PM" */
export function formatTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`)

/** 6 Monday-first weeks covering `month` (a UTC date on the 1st). */
function monthGrid(month) {
  const offset = (month.getUTCDay() + 6) % 7
  const start = addDays(month, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/**
 * @param {{
 *   id?: string, name?: string,
 *   value: string, onChange: (e: { target: { name?: string, value: string } }) => void,
 *   time?: string, onTimeChange?: (hhmm: string) => void,   // shows the time column when given
 *   min?: string, placeholder?: string, invalid?: boolean, disabled?: boolean,
 *   className?: string, 'aria-describedby'?: string,
 * }} props
 */
export function DatePicker({
  id, name, value, onChange, time, onTimeChange, min, placeholder = 'Select a date',
  invalid, disabled, className, ...aria
}) {
  const withTime = typeof onTimeChange === 'function'
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [draftTime, setDraftTime] = useState(time ?? '')
  const [month, setMonth] = useState(() => addMonths(fromIso(value || todayIso()), 0))
  const [focusDay, setFocusDay] = useState(value || todayIso())
  const [slide, setSlide] = useState('none')
  const [position, setPosition] = useState({})
  const triggerRef = useRef(null)
  const portalTarget = usePortalContainer(triggerRef)
  const panelRef = useRef(null)
  const gridRef = useRef(null)
  const timeListRef = useRef(null)
  const panelId = useId()
  const titleId = useId()

  const today = todayIso()
  const days = useMemo(() => monthGrid(month), [month])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  function show() {
    const start = value || (min && min > today ? min : today)
    setDraft(value)
    setDraftTime(time || (withTime ? '09:00' : ''))
    setMonth(addMonths(fromIso(start), 0))
    setFocusDay(start)
    setSlide('none')
    setOpen(true)
  }

  function apply() {
    if (draft) onChange?.({ target: { name, value: draft } })
    if (withTime && draftTime) onTimeChange(draftTime)
    close()
  }

  // Anchor under the trigger (left edges aligned), flip above if there's no room, keep on screen.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const { offsetWidth: w, offsetHeight: h } = panelRef.current
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    const below = window.innerHeight - rect.bottom
    const up = below < h + 16 && rect.top > below
    setPosition(
      up
        ? { bottom: window.innerHeight - rect.top + 6, left, transformOrigin: 'bottom left' }
        : { top: rect.bottom + 6, left, transformOrigin: 'top left' },
    )
  }, [open, withTime])

  // Focus the active day when opening / moving; centre the chosen time slot.
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus())
  }, [open, focusDay, month])
  useEffect(() => {
    if (!open || !withTime) return
    requestAnimationFrame(() => timeListRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' }))
  }, [open, withTime])

  // Outside press, scroll and resize dismiss (the panel is fixed-positioned).
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) close(false)
    }
    const onScroll = (e) => { if (!panelRef.current?.contains(e.target)) close(false) }
    const onResize = () => close(false)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  function page(delta) {
    setSlide(delta > 0 ? 'next' : 'prev')
    setMonth((m) => addMonths(m, delta))
    setFocusDay((d) => {
      const shifted = addMonths(fromIso(d), delta)
      const target = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), Math.min(fromIso(d).getUTCDate(), 28)))
      return toIso(target)
    })
  }

  function moveFocus(nextIso) {
    const next = fromIso(nextIso)
    if (next.getUTCMonth() !== month.getUTCMonth() || next.getUTCFullYear() !== month.getUTCFullYear()) {
      setSlide(next > month ? 'next' : 'prev')
      setMonth(addMonths(next, 0))
    }
    setFocusDay(nextIso)
  }

  function onGridKeyDown(e) {
    const d = fromIso(focusDay)
    const weekday = (d.getUTCDay() + 6) % 7
    const moves = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday,
    }
    if (e.key in moves) { e.preventDefault(); moveFocus(toIso(addDays(d, moves[e.key]))) }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); page(e.key === 'PageUp' ? -1 : 1) }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (min && focusDay < min) return
      if (draft === focusDay) apply()
      else setDraft(focusDay)
    }
  }

  function onPanelKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); close() }
  }

  // With a time column the trigger shows both, e.g. "Jul 1, 2026 · 9:00 AM".
  const display = value
    ? `${shortDate.format(fromIso(value))}${withTime && time ? ` · ${formatTime(time)}` : ''}`
    : withTime && placeholder === 'Select a date' ? 'Select date & time' : placeholder

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); show() } }}
        className={cn(
          'flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-default bg-surface px-2.75 text-left text-body outline-none',
          'transition-[border-color,box-shadow] duration-150 ease-out hover:border-strong pointer-coarse:text-base',
          'focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
          'aria-invalid:border-danger aria-invalid:hover:border-danger aria-invalid:focus-visible:ring-danger/20',
          'disabled:cursor-default disabled:opacity-60',
          open && 'border-primary ring-4 ring-primary/20',
          className,
        )}
        {...aria}
      >
        <Icon src={calendarIcon} />
        <span className={cn('min-w-0 flex-1 truncate tabular-nums', value ? 'text-fg' : 'text-fg-subtle')}>{display}</span>
      </button>
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          inert={!open}
          data-open={open || undefined}
          onKeyDown={onPanelKeyDown}
          className="menu-pop menu-surface fixed z-[var(--z-dropdown)] flex w-max max-w-[calc(100vw-16px)] flex-col overflow-hidden p-0"
          style={position}
        >
          <div className="flex min-h-0">
            {/* Calendar */}
            <div className="flex w-76 flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <CalNavButton label="Previous month" onClick={() => page(-1)}><ChevronLeft className="size-4" strokeWidth={2} /></CalNavButton>
                <h2 id={titleId} aria-live="polite" className="text-label font-semibold text-white">{monthTitle.format(month)}</h2>
                <CalNavButton label="Next month" onClick={() => page(1)}><ChevronRight className="size-4" strokeWidth={2} /></CalNavButton>
              </div>
              <div ref={gridRef} onKeyDown={onGridKeyDown} className="flex flex-col">
                <div aria-hidden className="grid grid-cols-7">
                  {WEEKDAYS.map((d) => (
                    <span key={d} className="flex h-9 items-center justify-center text-label-sm text-white/70">{d}</span>
                  ))}
                </div>
                <div key={toIso(month)} data-slide={slide} className="cal-slide grid grid-cols-7 gap-y-0.5">
                  {days.map((d) => {
                    const iso = toIso(d)
                    const outside = d.getUTCMonth() !== month.getUTCMonth()
                    const selected = iso === draft
                    const isToday = iso === today
                    const blocked = Boolean(min && iso < min)
                    return (
                      <button
                        key={iso}
                        type="button"
                        data-day={iso}
                        tabIndex={iso === focusDay ? 0 : -1}
                        aria-pressed={selected}
                        aria-current={isToday ? 'date' : undefined}
                        aria-label={`${dayLabel.format(d)}${isToday ? ' (today)' : ''}`}
                        disabled={blocked}
                        onClick={() => { setFocusDay(iso); if (outside) moveFocus(iso); setDraft(iso) }}
                        data-selected={selected || undefined}
                        className={cn(
                          'cal-day relative mx-auto flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-body tabular-nums outline-none',
                          outside ? 'text-white/35' : 'text-white/90',
                          'hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-white/60',
                          'disabled:cursor-default disabled:text-white/20 disabled:hover:bg-transparent',
                        )}
                      >
                        {d.getUTCDate()}
                        {isToday && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-blue-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time column */}
            {withTime && (
              <div className="flex w-36 flex-col border-l border-white/10 py-2">
                <span id={`${panelId}-time`} className="sr-only">Time</span>
                <div
                  ref={timeListRef}
                  role="listbox"
                  aria-labelledby={`${panelId}-time`}
                  className="cal-time-list max-h-[302px] flex-1 overflow-y-auto px-2"
                >
                  {TIME_SLOTS.map((slot) => {
                    const selected = slot === draftTime
                    return (
                      <div
                        key={slot}
                        role="option"
                        tabIndex={selected ? 0 : -1}
                        aria-selected={selected}
                        onClick={() => setDraftTime(slot)}
                        onKeyDown={(e) => {
                          const i = TIME_SLOTS.indexOf(slot)
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault()
                            const next = TIME_SLOTS[Math.max(0, Math.min(TIME_SLOTS.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
                            setDraftTime(next)
                            requestAnimationFrame(() => timeListRef.current?.querySelector('[aria-selected="true"]')?.focus())
                          } else if (e.key === 'Enter') { e.preventDefault(); apply() }
                        }}
                        className={cn(
                          'flex h-9 shrink-0 cursor-pointer items-center rounded-[10px] px-3 text-body tabular-nums outline-none transition-colors duration-120',
                          selected ? 'bg-white/14 font-medium text-white' : 'text-white/65 hover:bg-white/8 hover:text-white',
                          'focus-visible:ring-2 focus-visible:ring-white/60',
                        )}
                      >
                        {formatTime(slot)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
            <button type="button" onClick={() => close()} className="cursor-pointer rounded-lg px-2 py-2 text-label text-white/75 outline-none transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60">
              Cancel
            </button>
            <span className="ml-auto flex h-9 items-center gap-1.5 rounded-[10px] border border-white/15 px-3 text-body whitespace-nowrap tabular-nums" aria-live="polite">
              <span className="font-medium text-white">{draft ? shortDate.format(fromIso(draft)) : 'No date'}</span>
              {withTime && draftTime && <span className="text-white/65">{formatTime(draftTime)}</span>}
            </span>
            <button
              type="button"
              onClick={apply}
              disabled={!draft}
              className="press h-9 cursor-pointer rounded-[10px] bg-white px-3.5 text-label text-neutral-900 outline-none transition-[background-color,transform,opacity] duration-150 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>,
        portalTarget,
      )}
    </>
  )
}

function CalNavButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-white/15 bg-white/6 text-white/90 outline-none transition-[background-color,transform] duration-150 hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {children}
    </button>
  )
}

export default DatePicker
