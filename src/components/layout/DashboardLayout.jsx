import { useCallback, useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePersistentState } from '@/hooks/usePersistentState'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

/**
 * App shell — Sidebar + Navbar + optional toolbar + scrollable <main>.
 * Mirrors the Figma frame: only the content area scrolls; headers stay put.
 *
 * @param {{
 *   brand: string,
 *   navigation: object,
 *   activeId?: string,
 *   breadcrumb?: { label: string, href?: string }[],
 *   title?: string,
 *   actions?: object[],
 *   toolbar?: React.ReactNode,
 *   sidebarTop?: React.ReactNode,
 *   children: React.ReactNode,
 * }} props
 */
export function DashboardLayout({ brand, navigation, activeId, breadcrumb, title, actions, toolbar, sidebarTop, children }) {
  const isDesktop = useMediaQuery('(min-width: 64rem)')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [desktopHidden, setDesktopHidden] = usePersistentState('eventify:sidebar-hidden', false)

  // Close the drawer when switching to desktop.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false)
  }, [isDesktop])

  // Lock page scroll behind the open drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  const closeSidebar = useCallback(() => {
    if (isDesktop) setDesktopHidden(true)
    else setDrawerOpen(false)
    requestAnimationFrame(() => document.querySelector('[aria-label="Open sidebar"]')?.focus())
  }, [isDesktop, setDesktopHidden])

  const openSidebar = useCallback(() => {
    if (isDesktop) setDesktopHidden(false)
    else setDrawerOpen(true)
  }, [isDesktop, setDesktopHidden])

  const showMenuButton = !isDesktop || desktopHidden

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app">
      <Sidebar
        brand={brand}
        navigation={navigation}
        activeId={activeId}
        top={sidebarTop}
        open={drawerOpen}
        hiddenOnDesktop={desktopHidden}
        isDesktop={isDesktop}
        onClose={closeSidebar}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <Navbar
          breadcrumb={breadcrumb}
          title={title}
          actions={actions}
          showMenuButton={showMenuButton}
          menuExpanded={drawerOpen}
          onMenuClick={openSidebar}
        />
        {toolbar}
        {/* `relative` makes <main> the containing block for absolutely positioned
            descendants (e.g. `sr-only` captions/headings). Without it they anchor to
            <body>, escape this scroll container and make the whole window scroll. */}
        <main className="relative min-h-0 w-full flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[var(--width-content-max)]">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
