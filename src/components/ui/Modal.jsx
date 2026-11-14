import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'
import closeIcon from '@/assets/icons/close-lg.svg'

const EXIT_MS = 160

/**
 * Modal — Figma "Popup modal" (node 209:16428 family): 550px white panel, radius 12, black/30
 * backdrop. Header 24 × 16 padding with an 18/28 medium title and a 24px close icon; body
 * 24px sides; footer 24 × 16.
 *
 * Built on <dialog>.showModal(): focus is trapped, the page behind is inert, Esc closes.
 * Mark the field that should receive focus on open with `data-autofocus`.
 * Motion: panel scales 0.96 → 1 and fades over 220ms (modals aren't anchored to a trigger, so
 * they grow from the centre); backdrop fades with it. Closing plays a 160ms reverse first.
 *
 * @param {{
 *   open: boolean, onClose: () => void,
 *   title?: React.ReactNode,        // omit for a header with only the close button
 *   label?: string,                 // accessible name when there is no visible title
 *   footer?: React.ReactNode,
 *   className?: string, children: React.ReactNode,
 * }} props
 */
export function Modal({ open, onClose, title, label, footer, className, children }) {
  const ref = useRef(null)
  const titleId = useId()
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  // open → mount, showModal, then flip `visible` next frame so the enter transition runs.
  // close → flip `visible` off, wait for the exit transition, then close + unmount.
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
    if (!ref.current.open) {
      ref.current.showModal()
      // showModal() focuses the first focusable (the close button); prefer a marked field —
      // except on touch, where it would throw the keyboard open.
      if (!window.matchMedia('(pointer: coarse)').matches) ref.current.querySelector('[data-autofocus]')?.focus()
    }
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [open, mounted])

  if (!mounted) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label}
      data-visible={visible || undefined}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() /* backdrop click */ }}
      className="modal m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-137.5 overflow-visible bg-transparent p-0"
    >
      <div className={cn('modal-panel flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-lg bg-surface text-fg shadow-2xl', className)}>
        <header className={cn('flex shrink-0 items-center gap-3 px-6 py-4', title ? 'justify-between' : 'justify-end')}>
          {title && <h2 id={titleId} className="min-w-0 truncate text-h4 font-medium text-fg">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -mr-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-surface-muted focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <Icon src={closeIcon} className="size-6" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6">{children}</div>
        {footer && <footer className="flex shrink-0 items-center gap-3 px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  )
}

export default Modal
