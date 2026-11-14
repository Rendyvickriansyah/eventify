import { cn } from '@/lib/cn'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { IconButton } from '@/components/ui/IconButton'
import { Icon } from '@/components/ui/Icon'
import panelClosed from '@/assets/icons/panel-closed.svg'

/**
 * Figma top "Header": 72px, 32px side padding, breadcrumb (or a 20/28 semibold page `title`,
 * e.g. Figma "Account") left, 32px icon buttons right (8px gap).
 *
 * @param {{
 *   breadcrumb?: { label: string, href?: string }[],
 *   title?: string,
 *   actions?: { id: string, label: string, icon: React.ComponentType<{ className?: string, strokeWidth?: number }>,  // lucide icon badge?: boolean, onClick?: () => void }[],
 *   showMenuButton?: boolean,
 *   menuExpanded?: boolean,
 *   onMenuClick?: () => void,
 *   className?: string,
 * }} props
 */
export function Navbar({
  breadcrumb = [],
  title,
  actions = [],
  showMenuButton = false,
  menuExpanded = false,
  onMenuClick,
  className,
  ...props
}) {
  return (
    <header
      className={cn(
        'flex h-[var(--height-navbar)] w-full shrink-0 items-center justify-between gap-4 border-b border-default px-4 py-4 md:px-8',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showMenuButton && (
          <IconButton
            aria-label="Open sidebar"
            aria-controls="app-sidebar"
            aria-expanded={menuExpanded}
            onClick={onMenuClick}
          >
            <Icon src={panelClosed} className="-scale-x-100" />
          </IconButton>
        )}
        {title ? (
          <p className="truncate text-h3 tracking-normal text-fg">{title}</p>
        ) : (
          <Breadcrumb items={breadcrumb} />
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((action) => (
            <IconButton key={action.id} aria-label={action.label} title={action.label} badge={action.badge} onClick={action.onClick}>
              <action.icon aria-hidden className="size-4" strokeWidth={1.5} absoluteStrokeWidth />
            </IconButton>
          ))}
        </div>
      )}
    </header>
  )
}

export default Navbar
