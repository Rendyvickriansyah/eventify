import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

/**
 * Chart frame with Y-axis ticks (left) and X-axis ticks (bottom) — Figma "Total Revenue" card.
 * Layout: 16px padding, 32px gap between axis and graph, 24px gap between plot and x-axis.
 * Scrolls horizontally on narrow screens so the plot never squashes.
 *
 * @param {{ yTicks: string[], xTicks: string[], children: React.ReactNode,
 *           label?: string, className?: string }} props
 */
export function ChartCard({ yTicks = [], xTicks = [], label, children, className, ...props }) {
  return (
    <Card padding="none" className={cn('overflow-hidden', className)} {...props}>
      <figure className="overflow-x-auto p-3.75" aria-label={label}>
        <div className="flex min-w-160 items-start gap-8">
          {/* Y axis */}
          <div
            aria-hidden
            className="flex w-14 shrink-0 flex-col items-end justify-between self-stretch pb-6 text-body whitespace-nowrap text-fg-strong tabular-nums"
          >
            {yTicks.map((tick) => (
              <span key={tick} className="text-right">{tick}</span>
            ))}
          </div>

          {/* Graph */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {children}
            <div aria-hidden className="flex items-center justify-between text-body whitespace-nowrap text-fg-strong">
              {xTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </Card>
  )
}

export default ChartCard
