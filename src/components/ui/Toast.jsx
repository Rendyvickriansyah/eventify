import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CircleX, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'
import circleCheck from '@/assets/icons/circle-check.svg'
import infoIcon from '@/assets/icons/info.svg'
import closeIcon from '@/assets/icons/close.svg'

/*
 * Toast — Figma "Alert" (node 274:36849): white, #e5e5e5 border, radius 12, 16 × 12 padding,
 * 16px icon (2px top inset), 14/20 medium title (one line), 14/20 description at 70%.
 * Top-centre, 32px from the top, 471px wide.
 *
 * Usage (anywhere — the store is module-level, <Toaster /> is mounted once in App):
 *   toast.success('Event Created Successfully', { description: '…' })
 *   toast.error('Could not save', { description: '…', duration: 8000 })
 *   toast({ tone: 'info', title: '…' })
 */

/* Reading time, not a flat timer: ~220 wpm plus 1.5s to notice it, kept within 4–10s. */
const readingTime = (text) => Math.min(10000, Math.max(4000, 1500 + text.trim().split(/s+/).length * 270))
const EXIT_MS = 160

/* ── Store ─────────────────────────────────────────────────────────────────── */
let toasts = []
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
let seq = 0

/**
 * @param {{ tone?: 'success' | 'error' | 'warning' | 'info', title: string, description?: string,
 *           duration?: number }} options  duration in ms (default: reading time, 4–10s);
 *                                         `Infinity` keeps it until dismissed
 * @returns {string} id, for `toast.dismiss(id)`
 */
export function toast({ tone = 'info', title, description, duration = readingTime(`${title} ${description ?? ''}`) }) {
  const id = `toast-${++seq}`
  toasts = [...toasts, { id, tone, title, description, duration }]
  emit()
  return id
}
toast.success = (title, options) => toast({ ...options, tone: 'success', title })
toast.error = (title, options) => toast({ ...options, tone: 'error', title })
toast.warning = (title, options) => toast({ ...options, tone: 'warning', title })
toast.info = (title, options) => toast({ ...options, tone: 'info', title })
toast.dismiss = (id) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/* ── Presentational toast (also usable inline, e.g. in docs) ───────────────── */
const toneIcon = {
  success: <Icon src={circleCheck} />,
  info: <Icon src={infoIcon} />,
  warning: <TriangleAlert aria-hidden className="size-4 text-warning-fg" strokeWidth={1.5} />,
  error: <CircleX aria-hidden className="size-4 text-danger-fg" strokeWidth={1.5} />,
}

/**
 * @param {{ tone?: keyof typeof toneIcon, title: string, description?: string,
 *           onClose?: () => void, className?: string } & React.HTMLAttributes<HTMLDivElement>} props
 */
export function Toast({ tone = 'info', title, description, onClose, className, ...props }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-neutral-200 bg-surface px-4 py-3 shadow-lg dark:border-default',
        className,
      )}
      {...props}
    >
      <span className="flex shrink-0 pt-0.5">{toneIcon[tone]}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-label text-fg">{title}</p>
        {description && <p className="text-body text-fg-muted">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="press -mt-0.5 -mr-1.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-60 outline-none transition-[opacity,transform,background-color] duration-150 hover:bg-surface-muted hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <Icon src={closeIcon} />
        </button>
      )}
    </div>
  )
}

/* ── Viewport ──────────────────────────────────────────────────────────────── */

/** Mount once (App). Renders the live toasts top-centre in an aria-live region. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => toasts)
  return createPortal(
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-8 z-[var(--z-toast)] flex flex-col items-center gap-2 px-4"
    >
      {/* polite: announced without interrupting; errors use role=alert below */}
      <ol aria-live="polite" className="flex w-full max-w-[471px] flex-col gap-2">
        {items.map((item) => (
          <ToastItem key={item.id} {...item} />
        ))}
      </ol>
    </section>,
    document.body,
  )
}

/**
 * One live toast: slides in, auto-closes after `duration` (paused while hovered, focused or
 * the tab is hidden), and slides out before leaving the store.
 */
function ToastItem({ id, tone, title, description, duration }) {
  const [open, setOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const remaining = useRef(duration)
  const ref = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  // Enter on the next frame so the closed styles paint first (transition, not keyframes:
  // a dismiss mid-entry retargets smoothly).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Remove from the store once the exit transition has played.
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open || !closing) return
    const timer = setTimeout(() => toast.dismiss(id), EXIT_MS)
    return () => clearTimeout(timer)
  }, [open, closing, id])

  const dismiss = useCallback(() => { setClosing(true); close() }, [close])

  // Auto-close countdown; keeps the remaining time across pauses.
  useEffect(() => {
    if (!open || paused || !Number.isFinite(duration)) return
    const started = Date.now()
    const timer = setTimeout(dismiss, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [open, paused, duration, dismiss])

  // Don't let a toast expire unseen in a background tab.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <li
      ref={ref}
      className="toast"
      data-open={open || undefined}
      role={tone === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(document.hidden)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget)) setPaused(document.hidden) }}
      onKeyDown={(e) => { if (e.key === 'Escape') dismiss() }}
    >
      <Toast tone={tone} title={title} description={description} onClose={dismiss} />
    </li>
  )
}

export default Toast
