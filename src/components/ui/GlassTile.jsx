import { cn } from '@/lib/cn'

/**
 * Dark glass icon tile — same layer stack as the brand mark (conic rim + black/50 face),
 * sized for the Figma event CTA icons: 36px, 1.286px rim, radius 10.286 / 9 inner.
 * The icon is white artwork, so it is never inverted in dark mode.
 *
 * @param {{ src: string, className?: string }} props
 */
export function GlassTile({ src, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'brand-mark relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10.286px] border-[1.286px] border-default p-[1.286px]',
        className,
      )}
    >
      <span className="brand-mark-face flex h-full flex-1 items-center justify-center rounded-[9px]">
        <img src={src} alt="" width="18" height="18" className="block size-4.5" draggable={false} />
      </span>
    </span>
  )
}

export default GlassTile
