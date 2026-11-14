import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { BrandMark } from '@/components/ui/BrandMark'
import { IconButton } from '@/components/ui/IconButton'
import { Icon } from '@/components/ui/Icon'
import panelClosed from '@/assets/icons/panel-closed.svg'
import { SidebarGroup } from './SidebarGroup'

/**
 * Figma "Sidebar": 256px, white, black/10 right border.
 * Header 72px (brand + collapse), optional `top` slot (e.g. event switcher — header then has
 * no bottom border, as in the Figma event sidebar), scrollable menu groups, optional footer links.
 * ≥ lg: in-flow column (can be hidden). < lg: off-canvas drawer with overlay.
 *
 * @param {{
 *   brand: string,
 *   navigation: { groups: { id: string, title?: string, items: any[] }[], footer?: any[] },
 *   top?: React.ReactNode,
 *   activeId?: string,
 *   open?: boolean,            // mobile drawer state
 *   hiddenOnDesktop?: boolean, // desktop collapsed state
 *   isDesktop?: boolean,
 *   onClose?: () => void,
 *   className?: string,
 * }} props
 */
export function Sidebar({
  brand,
  navigation,
  activeId,
  top,
  open = false,
  hiddenOnDesktop = false,
  isDesktop = true,
  onClose,
  className,
  ...props
}) {
  const ref = useRef(null)
  const isDrawer = !isDesktop

  // Drawer: move focus in on open, trap Tab inside, close on Escape.
  useEffect(() => {
    if (!isDrawer || !open) return
    const node = ref.current
    const focusables = () =>
      [...node.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null)
    focusables()[0]?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key !== 'Tab') return
      const items = focusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDrawer, open, onClose])

  const onNavigate = isDrawer ? onClose : undefined

  return (
    <>
      {/* Overlay (mobile only) */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[var(--z-overlay)] bg-overlay transition-opacity duration-200 ease-out lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        ref={ref}
        id="app-sidebar"
        aria-label="Sidebar"
        inert={(isDrawer && !open) || (!isDrawer && hiddenOnDesktop) || undefined}
        className={cn(
          'flex w-[var(--width-sidebar)] shrink-0 flex-col overflow-hidden border-r border-default bg-sidebar',
          // drawer
          'fixed inset-y-0 left-0 z-[var(--z-sidebar)] transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // desktop
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          hiddenOnDesktop && 'lg:hidden',
          className,
        )}
        {...props}
      >
        {/* Header — 72px, 24 / 16 padding */}
        <div className={cn('flex h-[var(--height-navbar)] w-full shrink-0 items-center gap-2 py-3 pr-4 pl-6', !top && 'border-b border-default')}>
          <BrandMark />
          <p className="min-w-0 flex-1 truncate text-body-lg font-semibold text-fg">{brand}</p>
          <IconButton
            variant="plain"
            size="xs"
            aria-label="Close sidebar"
            aria-controls="app-sidebar"
            onClick={onClose}
          >
            <Icon src={panelClosed} />
          </IconButton>
        </div>

        {top && <div className="w-full shrink-0 pr-4 pl-3">{top}</div>}

        {/* Menu + footer */}
        <div className="flex min-h-0 w-full flex-1 flex-col justify-between overflow-y-auto">
          <nav aria-label="Main" className="flex w-full flex-col gap-4 px-3 py-4">
            {navigation.groups.map((group) => (
              <SidebarGroup
                key={group.id}
                title={group.title}
                items={group.items}
                activeId={activeId}
                onNavigate={onNavigate}
              />
            ))}
          </nav>

          {navigation.footer?.length > 0 && (
            <nav aria-label="Support" className="flex w-full shrink-0 flex-col px-3 py-4">
              <SidebarGroup items={navigation.footer} activeId={activeId} onNavigate={onNavigate} />
            </nav>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
