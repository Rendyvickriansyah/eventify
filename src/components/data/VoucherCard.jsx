import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import arrowIcon from '@/assets/icons/arrow-right.svg'

const edited = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

/**
 * E-voucher template card — Figma "E-Voucher" card (node 262:37469): 318px, black/10 border,
 * radius 12. Top: 20 × 12 padding, 14/20 medium name + "Last Edited …" at 70%, bottom border.
 * Bottom: 20 × 12 padding with a small secondary "Manage e-voucher →" button.
 *
 * @param {{ name: string, editedAt: string, onManage: () => void, className?: string,
 *           style?: React.CSSProperties }} props
 */
export function VoucherCard({ name, editedAt, onManage, className, style }) {
  return (
    <article aria-label={name} className={cn('flex flex-col rounded-lg border border-default bg-surface', className)} style={style}>
      <div className="flex flex-col gap-1 border-b border-default px-5 py-3">
        <h2 className="truncate text-label text-fg" title={name}>{name}</h2>
        <p className="text-body text-fg-muted">
          Last Edited <time dateTime={editedAt}>{edited.format(new Date(editedAt))}</time>
        </p>
      </div>
      <div className="px-5 py-3">
        {/* Hover nudges the arrow toward where the button takes you (fine pointers only). */}
        <Button variant="secondary" size="sm" onClick={onManage} className="voucher-manage" aria-label={`Manage ${name}`}>
          Manage e-voucher
          <Icon src={arrowIcon} className="voucher-arrow" />
        </Button>
      </div>
    </article>
  )
}

export default VoucherCard
