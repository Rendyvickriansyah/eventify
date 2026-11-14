import { cn } from '@/lib/cn'

/**
 * Figma "Sidebar Item": 36px tall, 12px × 8px padding, radius 8, 14/20.
 * Active: gray-100 background + semibold.
 *
 * @param {{ label: string, href: string, icon?: React.ReactNode, badge?: React.ReactNode,
 *           active?: boolean, onNavigate?: () => void, className?: string }} props
 */
export function SidebarItem({ label, href, icon, badge, active = false, onNavigate, className, ...props }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-3 py-2',
        'text-body text-fg transition-colors duration-150 outline-none',
        'hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-primary/40',
        active && 'bg-sidebar-active font-semibold text-sidebar-active-fg hover:bg-sidebar-active',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate" title={label}>{label}</span>
      {badge}
    </a>
  )
}

export default SidebarItem
