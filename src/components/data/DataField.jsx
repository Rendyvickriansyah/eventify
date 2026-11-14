import { cn } from '@/lib/cn'

/**
 * Label / value pair — Figma event card stat (label 14/20 at 70%, 4px gap, value 14/20).
 * @param {{ label: string, children: React.ReactNode, className?: string }} props
 */
export function DataField({ label, children, className, ...props }) {
  return (
    <div className={cn('flex min-w-0 flex-col items-start justify-center gap-1', className)} {...props}>
      <dt className="text-body whitespace-nowrap text-fg-muted">{label}</dt>
      <dd className="flex max-w-full min-w-0 text-body text-fg tabular-nums">
        {typeof children === 'string' ? <span className="truncate" title={children}>{children}</span> : children}
      </dd>
    </div>
  )
}

export default DataField
