import { useId } from 'react'
import { cn } from '@/lib/cn'
import { SidebarItem } from './SidebarItem'

/**
 * Titled list of sidebar links — Figma "General / Finance / Settings" groups.
 * Group title: 12/16 medium at 50%, 12px × 6px padding.
 *
 * @param {{ title?: string, items: { id: string, label: string, href: string }[],
 *           activeId?: string, onNavigate?: () => void, className?: string }} props
 */
export function SidebarGroup({ title, items = [], activeId, onNavigate, className, ...props }) {
  const titleId = useId()
  return (
    <div className={cn('flex w-56 max-w-full flex-col', className)} {...props}>
      {title && (
        <p id={titleId} className="px-3 py-1.5 text-label-sm whitespace-nowrap text-fg-subtle uppercase">
          {title}
        </p>
      )}
      <ul aria-labelledby={title ? titleId : undefined} className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <SidebarItem
              label={item.label}
              href={item.href}
              active={item.id === activeId}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SidebarGroup
