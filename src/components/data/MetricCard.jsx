import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

const trendStyles = {
  up: { symbol: '▲', tone: 'text-success-fg', word: 'Up' },
  down: { symbol: '▼', tone: 'text-danger-fg', word: 'Down' },
  neutral: { symbol: null, tone: 'text-fg', word: '' },
}

/**
 * Insight tile — Figma "Metrics Card": 124px tall, 16px padding, 40px gap,
 * title 14/20 regular, value 24/32 semibold. Optional `trend` sits on the value's
 * baseline (right side) so the card height stays at the Figma 124px.
 *
 * @param {{ label: string, value: React.ReactNode, loading?: boolean, className?: string,
 *           trend?: { direction: 'up' | 'down' | 'neutral', value: string, context?: string } }} props
 */
export function MetricCard({ label, value, trend, loading = false, className, ...props }) {
  return (
    <Card
      className={cn('flex h-31 min-w-0 flex-col items-start gap-10', className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-5 w-28 animate-pulse rounded-xs bg-surface-muted" />
          <span className="h-8 w-24 animate-pulse rounded-xs bg-surface-muted" />
        </>
      ) : (
        <>
          <p className="w-full truncate text-body text-fg" title={label}>{label}</p>
          <div className="flex w-full min-w-0 items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-metric text-fg tabular-nums">{value}</p>
            {trend && <Trend {...trend} />}
          </div>
        </>
      )}
    </Card>
  )
}

function Trend({ direction = 'neutral', value, context }) {
  const style = trendStyles[direction] ?? trendStyles.neutral
  return (
    <p className="shrink-0 text-caption whitespace-nowrap text-fg-subtle">
      <span className={cn('text-label-sm tabular-nums', style.tone)}>
        {style.symbol && <span aria-hidden>{style.symbol} </span>}
        {style.word && <span className="sr-only">{style.word} </span>}
        {value}
      </span>{' '}
      {context}
    </p>
  )
}

export default MetricCard
