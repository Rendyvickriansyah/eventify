import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Toolbar } from '@/components/layout/Toolbar'
import { PageSection } from '@/components/layout/PageSection'
import { Dropdown } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/data/MetricCard'
import { EventCard } from '@/components/data/EventCard'
import { ChartCard } from '@/components/data/ChartCard'
import { AreaChart } from '@/components/data/AreaChart'
import { Table } from '@/components/data/Table'
import { useHashRoute } from '@/hooks/useHashRoute'
import { navigation } from '@/data/navigation'
import {
  breadcrumb,
  headerActions,
  filters,
  insights,
  upcomingEvents,
  revenue,
  recentOrders,
} from '@/data/dashboard'

const orderColumns = [
  { key: 'id', header: 'Order ID' },
  { key: 'buyer', header: 'Buyer' },
  { key: 'ticket', header: 'Ticket Category' },
  { key: 'total', header: 'Total Gross (USD)' },
  {
    key: 'payment',
    header: 'Payment',
    render: (row) => <Badge tone={row.payment.tone}>{row.payment.label}</Badge>,
  },
]

export function Dashboard() {
  const activeId = useHashRoute('dashboard')
  const [filterValues, setFilterValues] = useState({})

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={navigation}
      activeId={activeId}
      breadcrumb={breadcrumb}
      actions={headerActions}
      toolbar={
        <Toolbar aria-label="Filters">
          {filters.map((filter) => (
            <Dropdown
              key={filter.id}
              label={filter.label}
              options={filter.options}
              value={filterValues[filter.id] ?? null}
              onChange={(value) => setFilterValues((prev) => ({ ...prev, [filter.id]: value }))}
            />
          ))}
        </Toolbar>
      }
    >
      <h1 className="sr-only">Dashboard — Indonesian League Match</h1>

      <PageSection title="Insights" className="pt-4 pb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {insights.map((metric) => (
            <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Upcoming Events">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {upcomingEvents.map(({ id, ...event }) => (
            <EventCard key={id} {...event} />
          ))}
        </div>
      </PageSection>

      {/* Figma fixes this section at 334px, which leaves 20px (not 28px) below the card */}
      <PageSection title="Total Revenue" className="pb-5">
        <ChartCard yTicks={revenue.yTicks} xTicks={revenue.xTicks} label="Total revenue chart">
          <AreaChart layers={revenue.layers} points={revenue.points} summary={revenue.summary} />
        </ChartCard>
      </PageSection>

      <PageSection title="Recent Order">
        <Table caption="Recent orders" columns={orderColumns} data={recentOrders} />
      </PageSection>
    </DashboardLayout>
  )
}

export default Dashboard
