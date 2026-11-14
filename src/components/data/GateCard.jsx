import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import divider from '@/assets/icons/divider-vertical.svg'

const number = new Intl.NumberFormat('en-US')

/**
 * Check-in gate — Figma "Gate Data" (node 293:29032).
 * Gray-50 shell (black/10 border, radius 12, 4px inset) holding a white header card
 * (radius 8, 12px padding: 18/28 semibold name, two 14/20 lines at 70%, status badge)
 * and a stats row (12px padding, 52px between groups, 48px between stats, 1px divider).
 *
 * @param {{
 *   name: string, type: string, opensAt: string, status: { label: string, tone: string },
 *   location: string, pic: string, checkedIn: number, expected: number, failed: number,
 *   scanTime: string, lastActivity: string, className?: string,
 * }} props
 */
export function GateCard({ name, type, opensAt, status, location, pic, checkedIn, expected, failed, scanTime, lastActivity, className }) {
  return (
    <article aria-label={name} className={cn('flex flex-col rounded-lg border border-default bg-gray-50 p-1 dark:bg-surface-muted', className)}>
      <header className="flex items-center justify-between gap-4 rounded-md border border-default bg-surface p-2.75">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-h4 text-fg">{name}</h3>
          <p className="text-body text-fg-muted">{opensAt}</p>
          <p className="text-body text-fg-muted">{type}</p>
        </div>
        {/* Figma badge here has symmetric 8px padding (no leading icon) */}
        <Badge tone={status.tone} className="shrink-0 px-[7.5px]">{status.label}</Badge>
      </header>

      <dl className="flex flex-wrap items-center gap-x-13 gap-y-4 p-3">
        <div className="flex flex-wrap items-center gap-x-12 gap-y-3">
          <Stat label="Location" value={location} />
          <Stat label="PIC" value={pic} />
        </div>
        <img src={divider} alt="" aria-hidden width="1" height="42" className="hidden w-px self-stretch md:block dark:invert" />
        <div className="flex flex-wrap items-center gap-x-12 gap-y-3">
          <Stat label="Checked-in" value={number.format(checkedIn)} strong />
          <Stat label="Expected" value={number.format(expected)} />
          <Stat label="Failed Scans" value={number.format(failed)} strong />
          <Stat label="Avg. Scan Time" value={scanTime} />
          <Stat label="Last Activity" value={lastActivity} />
        </div>
      </dl>
    </article>
  )
}

function Stat({ label, value, strong = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-body whitespace-nowrap text-fg-muted">{label}</dt>
      <dd className={cn('text-body whitespace-nowrap text-fg tabular-nums', strong && 'font-medium')}>{value}</dd>
    </div>
  )
}

export default GateCard
