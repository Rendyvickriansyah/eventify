import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { Menu } from '@/components/ui/Menu'
import { formatEdited } from '@/data/seating'
import moreIcon from '@/assets/icons/more-vertical.svg'

/**
 * Saved seating chart — Figma "Card 1/2" (nodes 191:12146, 191:12208).
 * 344 × 226: black/10 0.5px border, radius 12; 150px gray-50 preview; details row
 * (16px padding, 14/20 semibold name, 13/18 "Edited …" at 78%, 24px "More" menu).
 *
 * Motion: the preview eases up 2% on hover (fine pointers only); the card leaves with a
 * 160ms fade + 0.96 scale while `removing`, then calls `onExited`.
 *
 * @param {{
 *   chart: { id: string, name: string, image?: string, editedAt: number },
 *   href?: string,            // the editor — the whole card is its link (title carries it)
 *   now: number,
 *   menuItems: { id: string, label: string, onSelect: () => void, tone?: 'danger' }[],
 *   removing?: boolean,
 *   onExited?: () => void,
 *   className?: string,
 *   style?: React.CSSProperties,
 * }} props
 */
export function SeatingChartCard({ chart, now, href, menuItems, removing = false, onExited, className, style }) {
  const ref = useRef(null)

  // transitionend can be skipped (hidden tab, reduced-motion clamp) — fall back to a timer.
  useEffect(() => {
    if (!removing) return
    const timer = setTimeout(() => onExited?.(), 260)
    return () => clearTimeout(timer)
  }, [removing, onExited])

  return (
    <article
      ref={ref}
      aria-label={chart.name}
      data-removing={removing || undefined}
      inert={removing || undefined}
      onTransitionEnd={(e) => { if (removing && e.target === ref.current && e.propertyName === 'opacity') onExited?.() }}
      className={cn('seat-card group relative flex flex-col overflow-hidden rounded-lg border-[0.5px] border-black/10 bg-surface dark:border-default', href && 'seat-card-link has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-primary/20', className)}
      style={style}
    >
      <div className="relative h-37.5 overflow-hidden bg-gray-50 dark:bg-surface-muted">
        {chart.image ? (
          <img src={chart.image} alt={`${chart.name} seating layout`} width="344" height="150" draggable={false} className="seat-card-preview h-full w-full object-cover" />
        ) : (
          <div className="seat-card-grid flex h-full items-center justify-center">
            <span className="text-body text-fg-muted">No layout yet</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <hgroup className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-label font-semibold text-fg">
            {href ? (
              // Stretched link: its ::after covers the card, so a click anywhere opens the editor
              // while the title stays the one accessible link (no whole-card <a>).
              <a href={href} className="outline-none after:absolute after:inset-0 after:content-['']">{chart.name}</a>
            ) : chart.name}
          </h2>
          <p className="text-body-sm text-fg opacity-78 tabular-nums">{formatEdited(chart.editedAt, now)}</p>
        </hgroup>
        <Menu icon={moreIcon} label={`More actions for ${chart.name}`} items={menuItems} className="relative z-1 -mr-1 shrink-0" />
      </div>
    </article>
  )
}

export default SeatingChartCard
