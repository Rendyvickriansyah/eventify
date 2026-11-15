import { cn } from '@/lib/cn'
import { Dropdown } from '@/components/ui/Dropdown'
import { Icon } from '@/components/ui/Icon'
import chevronsLeft from '@/assets/icons/chevrons-left.svg'
import chevronLeft from '@/assets/icons/chevron-left.svg'
import chevronRight from '@/assets/icons/chevron-right-page.svg'
import chevronsRight from '@/assets/icons/chevrons-right.svg'

/**
 * Table pagination — Figma "Pagination" (node 266:34083): 16px padding; "Rows per page" +
 * a size dropdown on the left, "Page X of Y" in the middle, first / previous / next / last
 * buttons (36px, radius 10) on the right — the unavailable ones at 50%.
 *
 * @param {{ page: number, pageCount: number, onPage: (page: number) => void,
 *           pageSize: number, pageSizes?: number[], onPageSize: (size: number) => void,
 *           className?: string }} props   page is 1-based
 */
export function Pagination({ page, pageCount, onPage, pageSize, pageSizes = [10, 25, 50, 100], onPageSize, className }) {
  const last = Math.max(1, pageCount)
  const buttons = [
    { label: 'First page', icon: chevronsLeft, to: 1, disabled: page <= 1 },
    { label: 'Previous page', icon: chevronLeft, to: page - 1, disabled: page <= 1 },
    { label: 'Next page', icon: chevronRight, to: page + 1, disabled: page >= last },
    { label: 'Last page', icon: chevronsRight, to: last, disabled: page >= last },
  ]
  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3 p-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-label text-fg">Rows per page</span>
        <Dropdown
          label={String(pageSize)}
          align="start"
          options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))}
          value={String(pageSize)}
          onChange={(v) => { if (v) onPageSize(Number(v)) }}
        />
      </div>
      <p className="text-label text-fg tabular-nums" aria-live="polite">Page {Math.min(page, last)} of {last}</p>
      <div className="flex items-center gap-2">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            aria-label={b.label}
            title={b.label}
            disabled={b.disabled}
            onClick={() => onPage(b.to)}
            className="press flex size-9 cursor-pointer items-center justify-center rounded-control border border-default bg-control shadow-control outline-none transition-[background-color,opacity] duration-150 hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-control"
          >
            <Icon src={b.icon} />
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Pagination
