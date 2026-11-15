import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'
import closeIcon from '@/assets/icons/close-lg.svg'

const EXIT_MS = 180

/**
 * Side sheet — Figma "Popup Modal / Sheet" (node 306:31489): a 438px white panel, radius 12,
 * docked to the right edge with a gap, over a black/30 backdrop. Header 24 × 20 padding with a
 * 16/24 medium title and a 24px close icon; scrolling body; optional pinned footer.
 *
 * Built on <dialog>.showModal() like Modal: focus is trapped, the page behind is inert, Esc and
 * a click on the backdrop close it. Switching `children` while open (e.g. another row) keeps it open.
 * Motion: slides 24px in from the right + fades (260ms, ease-out — it comes from the edge it's
 * docked to); closing reverses faster (180ms). Reduced motion: fade only.
 *
 * @param {{ open: boolean, onClose: () => void, title: React.ReactNode,
 *           footer?: React.ReactNode, className?: string, children: React.ReactNode }} props
 */
export function Sheet({ open, onClose, title, footer, className, children }) {
  const ref = useRef(null)
  const titleId = useId()
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return undefined
    }
    setVisible(false)
    const timer = setTimeout(() => {
      ref.current?.close()
      setMounted(false)
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || !mounted || !ref.current) return undefined
    if (!ref.current.open) ref.current.showModal()
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [open, mounted])

  if (!mounted) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-visible={visible || undefined}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() /* backdrop */ }}
      className="sheet fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-[calc(438px+2rem)] overflow-visible bg-transparent p-4 md:max-w-[calc(438px+4rem)] md:p-8"
    >
      <div className={cn('sheet-panel flex h-full flex-col overflow-hidden rounded-lg bg-surface text-fg shadow-2xl', className)}>
        <header className="flex shrink-0 items-center gap-3 px-6 py-5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-body-lg font-medium text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -m-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-surface-muted focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <Icon src={closeIcon} className="size-6" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>
        {footer && <footer className="flex shrink-0 flex-col gap-3 px-6 pt-3 pb-6">{footer}</footer>}
      </div>
    </dialog>
  )
}

export default Sheet
