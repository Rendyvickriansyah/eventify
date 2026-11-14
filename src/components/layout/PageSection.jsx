import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Dashboard content block with a 16/24 medium title and 12px gap to its content.
 * Default spacing = Figma sections (32px sides, 28px bottom).
 *
 * @param {{ title: string, actions?: React.ReactNode, className?: string, children: React.ReactNode }} props
 */
export function PageSection({ title, actions, className, children, ...props }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('flex w-full flex-col gap-3 px-4 pb-7 md:px-8', className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="text-body-lg font-medium whitespace-nowrap text-fg">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

export default PageSection
