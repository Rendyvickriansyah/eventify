import { cn } from '@/lib/cn'

/**
 * Empty state — Figma "Empty States" (node 286:29676): illustration slot, 20px gap, centred
 * 18/28 medium title + 14/20 description at 70%, then actions 24px below (16px apart).
 * Width 370px so the description wraps like the design.
 *
 * @param {{ illustration?: React.ReactNode, title: string, description?: React.ReactNode,
 *           actions?: React.ReactNode, className?: string }} props
 */
export function EmptyState({ illustration, title, description, actions, className }) {
  return (
    <div className={cn('enter-rise flex w-full max-w-92.5 flex-col items-center gap-6 text-center', className)}>
      <div className="flex w-full flex-col items-center gap-5">
        {illustration}
        <div className="flex flex-col gap-1">
          <h2 className="text-h4 font-medium text-fg">{title}</h2>
          {description && <p className="text-body text-pretty text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-start justify-center gap-4">{actions}</div>}
    </div>
  )
}

export default EmptyState
