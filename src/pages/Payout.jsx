import { Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageSection } from '@/components/layout/PageSection'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { MetricCard } from '@/components/data/MetricCard'
import { CardBrandLogo } from '@/components/data/CardBrandLogo'
import { PayoutAccountTable, PayoutHistoryTable } from '@/components/data/PayoutTables'
import { WithdrawModal } from '@/components/data/WithdrawModal'
import { CountUp, CountUpText } from '@/components/ui/CountUp'
import { navigation } from '@/data/navigation'
import { headerActions } from '@/data/dashboard'
import { payoutBreadcrumb, balance, recentPeriod, payoutAccounts, payoutHistory } from '@/data/payout'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const formatMoney = (n) => money.format(n)
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** Sections fade/rise in on mount, 50ms apart (see `.enter-rise` in components.css). */
const enter = (index) => ({ '--enter-index': index })

/** Payout / Wallet — Figma "Payout" (node 208:15171). */
export function Payout() {
  const [accounts, setAccounts] = useState(payoutAccounts)
  const [available, setAvailable] = useState(balance.available)
  const [history, setHistory] = useState(payoutHistory)
  const [withdraw, setWithdraw] = useState(null) // null | { initialAmount?: number }

  // A sent payout leaves the balance and shows up first in the history as "Processing".
  function recordPayout({ amount, net }) {
    setAvailable((a) => Math.round((a - amount) * 100) / 100)
    setHistory((rows) => [
      {
        id: `#PAY-${String(42 + rows.length - payoutHistory.length).padStart(4, '0')}`,
        period: 'Manual withdrawal',
        amount: money.format(net),
        status: { label: 'Processing', tone: 'warning' },
        date: shortDate.format(new Date()),
      },
      ...rows,
    ])
  }

  const setDefault = (id) => setAccounts((list) => list.map((a) => ({ ...a, isDefault: a.id === id })))
  const remove = (id) => setAccounts((list) => list.filter((a) => a.id !== id))

  const accountRows = accounts.map((a) => ({
    id: a.id,
    avatar: <CardBrandLogo brand={a.brand} />,
    title: a.number,
    menuLabel: `card ending ${a.number.slice(-4)}`,
    subtitle: a.holder,
    currency: a.currency,
    badge: a.isDefault ? <Badge tone="neutral">Default</Badge> : null,
    isDefault: a.isDefault,
  }))

  const menuItems = (row) => [
    { id: 'default', icon: Star, label: row.isDefault ? 'Default method' : 'Set as default', disabled: row.isDefault, onSelect: () => setDefault(row.id) },
    { id: 'edit', icon: Pencil, label: 'Edit details', onSelect: () => {} },
    { id: 'sep', type: 'separator' },
    { id: 'remove', icon: Trash2, label: 'Remove', tone: 'danger', onSelect: () => remove(row.id) },
  ]

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={navigation}
      activeId="wallet"
      breadcrumb={payoutBreadcrumb}
      actions={headerActions}
    >
      <h1 className="sr-only">Payout</h1>

      {/* Total Balance — 28 top / 20 bottom, then actions, then banner (20 top) */}
      <section aria-labelledby="balance-label" className="enter-rise" style={enter(0)}>
        <div className="flex flex-col gap-2 px-4 pt-7 pb-5 md:px-8">
          <p id="balance-label" className="text-body-lg text-fg-soft">Total Balance</p>
          <p className="flex flex-wrap items-baseline gap-x-3 text-metric text-fg tabular-nums">
            <CountUp value={available} format={formatMoney} duration={1100} />
            <span className="font-medium text-fg-soft">{balance.currency}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 md:px-8">
          <Button variant="glass" className="h-9 w-30" onClick={() => setWithdraw({})} disabled={available < 100}>Withdraw</Button>
          <Button variant="secondary" className="h-9 rounded-lg px-2.75 text-shadow-button" onClick={() => setWithdraw({ initialAmount: available })} disabled={available < 100}>
            Withdraw All
          </Button>
        </div>
        <div className="px-4 pt-5 md:px-8">
          <Banner>{balance.nextPayout}</Banner>
        </div>
      </section>

      <PageSection title="Recent Period" className="enter-rise pt-6 pb-6" style={enter(1)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {recentPeriod.map((metric, i) => (
            <MetricCard key={metric.id} label={metric.label} value={<CountUpText text={metric.value} delay={150 + i * 80} />} trend={metric.trend} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Payout Account" className="enter-rise pb-0" style={enter(2)}>
        <PayoutAccountTable accounts={accountRows} menuItems={menuItems} />
      </PageSection>

      <PageSection title="Payout History" className="enter-rise pt-6" style={enter(3)}>
        <PayoutHistoryTable rows={history} />
      </PageSection>

      <WithdrawModal
        open={Boolean(withdraw)}
        onClose={() => setWithdraw(null)}
        balance={available}
        accounts={accounts}
        initialAmount={withdraw?.initialAmount}
        onWithdraw={recordPayout}
      />
    </DashboardLayout>
  )
}

export default Payout
