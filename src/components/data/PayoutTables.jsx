import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Menu } from '@/components/ui/Menu'
import { Table } from './Table'
import walletIcon from '@/assets/icons/wallet.svg'

/*
 * Shared payout tables — Figma "Payout Account" and "Payout History", used by the
 * Wallet page (node 208:15171) and the event Payouts tab (node 182:18952).
 */

const historyColumns = [
  { key: 'id', header: 'Payout ID' },
  { key: 'period', header: 'Period' },
  { key: 'amount', header: 'Amount' },
  { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status.tone}>{row.status.label}</Badge> },
  { key: 'date', header: 'Date' },
]

/**
 * @param {{ rows: { id: string, period: string, amount: string, status: { label: string, tone: string }, date: string }[],
 *           caption?: string, className?: string }} props
 */
export function PayoutHistoryTable({ rows, caption = 'Payout history', className }) {
  return <Table caption={caption} columns={historyColumns} data={rows} rowKey={(row) => row.id} className={className} emptyState="No payouts yet." />
}

/**
 * Withdrawal methods with a "Manage ⌄" menu per row.
 * Figma: method column 600 of 1128 (≈54%), 40px avatar, 12px gap, title 14/20 medium,
 * subtitle 14/20 at 70% (Wallet page) or 50% (event page — `subtitle="subtle"`).
 *
 * @param {{
 *   accounts: { id: string, avatar: React.ReactNode, title: string, subtitle: string, currency: string,
 *               badge?: React.ReactNode, menuLabel?: string }[],   // menuLabel: spoken name, e.g. "card ending 5123"
 *   menuItems: (account: object) => { id: string, label: string, onSelect: () => void, disabled?: boolean, tone?: 'danger' }[],
 *   subtitle?: 'muted' | 'subtle',
 *   caption?: string,
 *   className?: string,
 * }} props
 */
export function PayoutAccountTable({ accounts, menuItems, subtitle = 'muted', caption = 'Payout accounts', className }) {
  const columns = [
    {
      key: 'method',
      header: 'Withdrawal Method',
      className: 'w-[54%] py-3',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.avatar}
          <div className={cn('flex min-w-0 flex-col', subtitle === 'subtle' && 'gap-0.5')}>
            <span className="flex items-center gap-2">
              <span className="truncate text-label text-fg">{row.title}</span>
              {row.badge}
            </span>
            <span className={cn('truncate text-body', subtitle === 'subtle' ? 'text-fg-subtle' : 'text-fg-muted')}>{row.subtitle}</span>
          </div>
        </div>
      ),
    },
    { key: 'currency', header: 'Currency' },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (row) => <Menu triggerLabel="Manage" label={`Manage ${row.menuLabel ?? row.title}`} items={menuItems(row)} />,
    },
  ]
  return (
    <Table caption={caption} columns={columns} data={accounts} rowKey={(row) => row.id} className={className} emptyState="No payout account yet." />
  )
}

/** Figma wallet avatar: 40px gray-50 disc, black/8 0.941px border, 16px wallet icon. */
export function WalletAvatar() {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-[0.941px] border-black/8 bg-gray-50 dark:border-default dark:bg-surface-muted">
      <Icon src={walletIcon} />
    </span>
  )
}

export default PayoutAccountTable
