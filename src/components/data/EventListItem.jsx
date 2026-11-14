import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import dot from '@/assets/icons/dot.svg'
import imageIcon from '@/assets/icons/image.svg'

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const dayFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'UTC' })
const fullFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const number = new Intl.NumberFormat('en-US')

/**
 * Event row — Figma "Event Card" in the Event List (node 294:29502).
 * Info (calendar · 68px cover · title/meta) on the left; stats (Tickets Sold with
 * progress, Price Range, 155px columns, 56px gap) and "View More" on the right.
 * Stacks below `xl`, where the row no longer fits on one line.
 *
 * @param {{
 *   title: string, date: string | null, category: string,      // date null = not scheduled yet
 *   cover?: { src: string, alt: string, crop?: { left: number, top: number, width: number, height: number } } | null,
 *   sold: number, capacity: number, priceRange?: string | null,  // capacity 0 = no ticket types yet
 *   href?: string, onAction?: () => void, className?: string,
 * }} props
 */
export function EventListItem({ title, date, category, cover, sold, capacity, priceRange, href, onAction, className, ...props }) {
  const when = date ? new Date(`${date}T00:00:00Z`) : null
  const crop = cover?.crop

  return (
    <Card
      as="article"
      className={cn('flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between', className)}
      {...props}
    >
      {/* Info */}
      <div className="flex min-w-0 items-center gap-5">
        {when ? (
          <time dateTime={date} className="flex w-9 shrink-0 flex-col items-center gap-1 text-fg">
            <span className="text-label-sm text-fg-subtle">{monthFormat.format(when)}</span>
            <span className="text-body-lg font-semibold tabular-nums">{dayFormat.format(when)}</span>
          </time>
        ) : (
          <span className="flex w-9 shrink-0 flex-col items-center gap-1 text-fg" aria-label="Date not set">
            <span aria-hidden className="text-label-sm text-fg-subtle">TBA</span>
            <span aria-hidden className="text-body-lg font-semibold">—</span>
          </span>
        )}

        <div className="relative flex size-17 shrink-0 items-center justify-center overflow-hidden rounded-md bg-media">
          {cover ? <img
            src={cover.src}
            alt={cover.alt}
            loading="lazy"
            className={cn('pointer-events-none absolute max-w-none object-cover', !crop && 'inset-0 size-full')}
            style={crop && { left: crop.left, top: crop.top, width: crop.width, height: crop.height }}
          /> : <Icon src={imageIcon} className="opacity-40" />}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-2 py-2">
          <h3 className="truncate text-label text-fg" title={title}>{title}</h3>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-body whitespace-nowrap text-fg-muted">{when ? fullFormat.format(when) : 'Date not set'}</span>
            <Icon src={dot} size="xs" />
            <Badge tone="neutral">{category}</Badge>
          </div>
        </div>
      </div>

      {/* Stats + action */}
      <div className="flex flex-wrap items-center gap-x-14 gap-y-4 xl:flex-nowrap">
        <dl className="contents">
          <div className="flex w-38.75 flex-col justify-center gap-2">
            <dt className="text-caption text-fg-muted">Tickets Sold</dt>
            <dd className="flex flex-col gap-1.5">
              {capacity > 0 ? (
                <>
                  <span className="text-body font-medium text-fg tabular-nums">
                    {number.format(sold)} / {number.format(capacity)}
                  </span>
                  <ProgressBar value={sold} max={capacity} label="Tickets sold" />
                </>
              ) : (
                <span className="text-body text-fg-muted">No tickets yet</span>
              )}
            </dd>
          </div>

          <div className="flex w-38.75 flex-col gap-2 self-stretch">
            <dt className="text-caption text-fg-muted">Price Range</dt>
            <dd className={cn('text-body tabular-nums', priceRange ? 'font-medium text-fg' : 'text-fg-muted')}>{priceRange ?? '—'}</dd>
          </div>
        </dl>

        <Button variant="secondary" size="sm" {...(href ? { as: 'a', href } : { onClick: onAction })} aria-label={`View more: ${title}`} className="ml-auto xl:ml-0">
          View More
        </Button>
      </div>
    </Card>
  )
}

export default EventListItem
