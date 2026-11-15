import { cn } from '@/lib/cn'

/**
 * Bordered list of "title + description … action" rows — Figma Account "Security" and
 * "Danger Zone": 12px radius container, rows 12 × 16 padding with a divider, 2px between
 * title (14/20 medium) and description (14/20 at 70%), 40px before the action.
 * Stacks on small screens.
 *
 * @param {{ rows: { id: string, title: React.ReactNode, badge?: React.ReactNode,
 *           description: React.ReactNode, action: React.ReactNode }[],
 *           tone?: 'default' | 'danger', className?: string }} props
 */
export function ActionList({ rows, tone = 'default', className }) {
  return (
    <ul className={cn('rounded-lg border', tone === 'danger' ? 'border-red-400' : 'border-default', className)}>
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col items-start gap-3 border-b border-default px-3 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-10"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="flex items-center gap-2 text-label text-fg">
              {row.title}
              {row.badge}
            </p>
            <p className="text-body text-pretty text-fg-muted">{row.description}</p>
          </div>
          {row.action}
        </li>
      ))}
    </ul>
  )
}

/* Figma secondary "_Base Buttons" used as a row action: 36px, radius 12, 12 × 10 padding, 14/20 medium */
export const actionButtonClass = 'h-9 shrink-0 rounded-lg px-2.75 text-shadow-button'

export default ActionList
