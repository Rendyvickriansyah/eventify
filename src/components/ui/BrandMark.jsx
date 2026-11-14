import { cn } from '@/lib/cn'
import logoMark from '@/assets/icons/logo-mark.svg'

/**
 * Eventify logo tile — Figma sidebar 28×28 glass tile with the mark.
 * @param {{ className?: string }} props
 */
export function BrandMark({ className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn(
        'brand-mark relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-default p-px',
        className,
      )}
      {...props}
    >
      <span className="brand-mark-face flex h-full flex-1 items-center justify-center rounded-inner">
        <img src={logoMark} alt="" width="11.6667" height="11.6667" className="block" draggable={false} />
      </span>
    </span>
  )
}

export default BrandMark
