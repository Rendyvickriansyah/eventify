import { cn } from '@/lib/cn'

/**
 * Figma secondary "Header" (filter bar): 60px incl. border, 32px side padding,
 * right-aligned controls with 10px gap.
 * Bottom padding is 11px so that 12 + 36 + 11 + 1px border = 60px.
 *
 * @param {{ align?: 'start' | 'end', className?: string, children: React.ReactNode }} props
 */
export function Toolbar({ align = 'end', className, children, ...props }) {
  return (
    <div
      role="toolbar"
      className={cn(
        'flex w-full shrink-0 items-center border-b border-default px-4 pt-3 pb-2.75 md:px-8',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start gap-2.5">{children}</div>
    </div>
  )
}

export default Toolbar
