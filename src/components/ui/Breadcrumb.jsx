import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import chevronRight from '@/assets/icons/chevron-right.svg'
import { Icon } from './Icon'

/**
 * Figma "Breadcrumb": 16/24 medium, ancestors at 50%, 16px chevron, 10px gap.
 * The last item is the current page. On small screens only the current page shows.
 *
 * @param {{ items: { label: string, href?: string }[], className?: string }} props
 */
export function Breadcrumb({ items = [], className, ...props }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)} {...props}>
      <ol className="flex min-w-0 items-center gap-2.5">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1
          return (
            <Fragment key={item.label}>
              {index > 0 && (
                <li aria-hidden className="shrink-0 max-sm:hidden">
                  <Icon src={chevronRight} />
                </li>
              )}
              <li className={cn('flex min-w-0 items-center', !isCurrent && 'shrink-0 max-sm:hidden')}>
                {isCurrent ? (
                  <span aria-current="page" className="truncate text-body-lg font-medium text-fg" title={item.label}>
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    className="rounded-xs text-body-lg font-medium whitespace-nowrap text-fg-subtle transition-colors duration-150 outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
