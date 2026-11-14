import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import dot from '@/assets/icons/dot.svg'
import { DataField } from './DataField'

/**
 * Upcoming event summary — Figma "Card 4 / Card 5".
 *
 * @param {{
 *   title: string,
 *   date: string,
 *   category: string,
 *   cover: { src: string, alt: string, crop?: { left: number, top: number, width: number, height: number } },
 *   fields: { label: string, value?: string, badge?: { label: string, tone: string } }[],
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   className?: string,
 * }} props
 */
export function EventCard({
  title,
  date,
  category,
  cover,
  fields = [],
  actionLabel = 'View More',
  onAction,
  className,
  ...props
}) {
  const crop = cover.crop
  return (
    <Card as="article" className={cn('flex min-w-0 flex-col gap-6', className)} {...props}>
      {/* Header: cover + title/meta, action button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-17 w-34.5 shrink-0 overflow-hidden rounded-lg bg-media">
            <img
              src={cover.src}
              alt={cover.alt}
              loading="lazy"
              className={cn(
                'pointer-events-none absolute max-w-none object-cover',
                !crop && 'inset-0 size-full',
              )}
              style={crop && { left: crop.left, top: crop.top, width: crop.width, height: crop.height }}
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-2 sm:py-2">
            <h3 className="truncate text-label text-fg" title={title}>{title}</h3>
            <div className="flex items-center gap-2">
              <time className="text-body whitespace-nowrap text-fg-muted">{date}</time>
              <Icon src={dot} size="xs" />
              <Badge tone="neutral">{category}</Badge>
            </div>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onAction} aria-label={`${actionLabel}: ${title}`}>
          {actionLabel}
        </Button>
      </div>

      {/* Stats: 3 columns × 2 rows (2 columns on small screens) */}
      <dl className="grid grid-cols-2 items-center gap-x-7 gap-y-5 sm:grid-cols-3">
        {fields.map((field) => (
          <DataField key={field.label} label={field.label}>
            {field.badge ? <Badge tone={field.badge.tone}>{field.badge.label}</Badge> : field.value}
          </DataField>
        ))}
      </dl>
    </Card>
  )
}

export default EventCard
