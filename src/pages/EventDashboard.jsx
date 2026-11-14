import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Check, Wallet } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageSection } from '@/components/layout/PageSection'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { GlassTile } from '@/components/ui/GlassTile'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { MetricCard } from '@/components/data/MetricCard'
import { Table } from '@/components/data/Table'
import { PayoutAccountTable, PayoutHistoryTable, WalletAvatar } from '@/components/data/PayoutTables'
import { GateCard } from '@/components/data/GateCard'
import { EventSettings } from '@/components/data/EventSettings'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation, eventTabs } from '@/data/eventDetail'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import calendarIcon from '@/assets/icons/calendar.svg'
import copyIcon from '@/assets/icons/copy.svg'
import shareIcon from '@/assets/icons/share.svg'
import megaphoneIcon from '@/assets/icons/megaphone.svg'
import trendIcon from '@/assets/icons/trend-up.svg'

const int = new Intl.NumberFormat('en-US')

const ticketColumns = [
  { key: 'name', header: 'Ticket Type' },
  {
    key: 'sold',
    header: 'Ticket Sold',
    className: 'py-2',
    render: (row) => (
      <span className="flex flex-col gap-2">
        <span>{int.format(row.sold)} / {int.format(row.capacity)}</span>
        <ProgressBar value={row.sold} max={row.capacity} label={`${row.name} tickets sold`} />
      </span>
    ),
  },
  { key: 'price', header: 'Price', render: (row) => `$${int.format(row.price)}` },
]

const orderColumns = [
  { key: 'id', header: 'Order ID' },
  { key: 'buyer', header: 'Buyer' },
  { key: 'ticket', header: 'Ticket Category' },
  { key: 'total', header: 'Total Gross (USD)' },
  { key: 'payment', header: 'Payment', render: (row) => <Badge tone={row.payment.tone}>{row.payment.label}</Badge> },
]

/** Sections fade/rise in on mount, 50ms apart (see `.enter-rise` in components.css). */
const enter = (index) => ({ '--enter-index': index })

/**
 * Event Dashboard — Figma "Overview" (node 175:16349). Route: #/event/:id[/section].
 * @param {{ eventId: string, section?: string }} props
 */
export function EventDashboard({ eventId, section = 'overview' }) {
  const event = getEventDetail(eventId)
  const [tab, setTab] = useState('overview')
  // Stagger only on first paint; tab switches (frequent) get a quick fade instead.
  const [tabTouched, setTabTouched] = useState(false)
  const rise = tabTouched ? '' : 'enter-rise '
  const salesRef = useRef(null)
  const [copied, copyLink] = useCopyFeedback()

  if (!event) {
    return (
      <DashboardLayout brand="Eventify" navigation={eventNavigation(eventId)} breadcrumb={[{ label: 'Events', href: '#/events' }, { label: 'Not found' }]} actions={headerActions}>
        <div className="px-4 py-16 text-center md:px-8">
          <h1 className="text-h4 font-medium text-fg">Event not found</h1>
          <p className="mt-2 text-body text-fg-muted">It may have been removed. <a href="#/events" className="text-primary underline-offset-4 hover:underline">Back to events</a></p>
        </div>
      </DashboardLayout>
    )
  }

  const url = `${window.location.origin}${window.location.pathname}#/event/${event.id}`

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, url }) } catch { /* dismissed */ }
    } else {
      copyLink(url)
    }
  }

  const switcher = <EventSwitcher eventId={event.id} title={event.title} />

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId={section}
      sidebarTop={switcher}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
    >
      {/* Event Information — 28px vertical */}
      <section
        aria-labelledby="event-title"
        className="enter-rise flex flex-col gap-4 px-4 py-7 sm:flex-row sm:items-center sm:justify-between md:px-8"
        style={enter(0)}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <h1 id="event-title" className="text-h4 font-medium text-fg">{event.title}</h1>
          <p className="flex items-center gap-2 text-body-lg text-fg-muted">
            <Icon src={calendarIcon} />
            {event.when}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button className={actionClass} leftIcon={copied ? <Check aria-hidden /> : <Icon src={copyIcon} />} onClick={() => copyLink(url)}>
            {copied ? 'Copied' : 'Copy Link'}
          </Button>
          <Button className={actionClass} leftIcon={<Icon src={shareIcon} />} onClick={share}>
            Share
          </Button>
          <span role="status" className="sr-only">{copied ? 'Event link copied to clipboard' : ''}</span>
        </div>
      </section>

      {/* CTA cards */}
      <div className="enter-rise grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:px-8" style={enter(1)}>
        <CtaCard icon={megaphoneIcon} title="Promote Event" description="Share your event page and boost ticket sales" onClick={share} />
        <CtaCard
          icon={trendIcon}
          title="Track Sales"
          description="Monitor ticket sales and revenue in real time"
          onClick={() => salesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      {/* Tab Container — 12px top, 32px left */}
      <div className="enter-rise border-b border-default px-4 pt-3 md:px-8" style={enter(2)}>
        <Tabs tabs={eventTabs} value={tab} onChange={(id) => { setTab(id); setTabTouched(true) }} idPrefix="event" label="Event sections" variant="inline" />
      </div>

      <div key={tab} role="tabpanel" id={`event-panel-${tab}`} aria-labelledby={`event-tab-${tab}`} className={tabTouched ? 'tab-fade' : undefined}>
        {tab === 'overview' ? (
          <>
            <PageSection title="All-Time Period" className={`${rise}pt-6 pb-8`} style={enter(3)}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {event.metrics.map((metric) => (
                  <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
                ))}
              </div>
            </PageSection>

            <PageSection ref={salesRef} title="Sales by ticket type" className={`${rise}scroll-mt-4 pb-8`} style={enter(4)}>
              <Table caption="Sales by ticket type" columns={ticketColumns} data={event.ticketTypes} rowKey={(row) => row.id} />
            </PageSection>

            <PageSection title="Recent Order" className={rise} style={enter(5)}>
              <Table caption="Recent orders" columns={orderColumns} data={event.recentOrders.slice(0, 4)} rowKey={(row) => row.id} />
            </PageSection>
          </>
        ) : tab === 'payouts' ? (
          <EventPayouts payouts={event.payouts} />
        ) : tab === 'orders' ? (
          <>
            {/* Figma "All-Time Orders": four cards, 24 top / 32 bottom */}
            <PageSection title="All-Time Orders" className="pt-6 pb-8">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {event.orderMetrics.map((metric) => (
                  <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
                ))}
              </div>
            </PageSection>
            <PageSection title="Recent Order">
              <Table caption="Recent orders" columns={orderColumns} data={event.recentOrders} rowKey={(row) => row.id} />
            </PageSection>
          </>
        ) : tab === 'settings' ? (
          <EventSettings settings={event.settings} />
        ) : tab === 'checkin' ? (
          <>
            {/* Figma "Check-in Overview": four cards, 24 top / 32 bottom */}
            <PageSection title="Check-in Overview" className="pt-6 pb-8">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {event.checkin.metrics.map((metric) => (
                  <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
                ))}
              </div>
            </PageSection>
            <PageSection title="Gate monitor">
              <div className="flex flex-col gap-3">
                {event.checkin.gates.map(({ id, ...gate }) => (
                  <GateCard key={id} {...gate} />
                ))}
              </div>
            </PageSection>
          </>
        ) : (
          <p className="px-4 py-16 text-center text-body text-fg-muted md:px-8">
            {eventTabs.find((t) => t.id === tab)?.label} for this event will appear here.
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}

/**
 * Payouts tab — Figma "Payout" (node 182:18952): Recent Period cards, the payout account
 * (event earnings go to the organizer's Main Wallet) and this event's payout history.
 * Each section is 32px apart. Only reachable via a tab switch, so it relies on the panel fade.
 */
function EventPayouts({ payouts }) {
  const account = {
    ...payouts.account,
    avatar: <WalletAvatar />,
  }
  const menuItems = () => [
    { id: 'wallet', icon: Wallet, label: 'View in Wallet', onSelect: () => { window.location.hash = '#/wallet' } },
    { id: 'change', icon: ArrowLeftRight, label: 'Change payout account', onSelect: () => { window.location.hash = '#/wallet' } },
  ]

  return (
    <>
      <PageSection title="Recent Period" className="pt-6 pb-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {payouts.metrics.map((metric) => (
            <MetricCard key={metric.id} label={metric.label} value={metric.value} trend={metric.trend} />
          ))}
        </div>
      </PageSection>

      <PageSection title="Payout Account" className="pb-8">
        <PayoutAccountTable accounts={[account]} menuItems={menuItems} subtitle="subtle" caption="Payout account for this event" />
      </PageSection>

      <PageSection title="Payout History" className="pb-8">
        <PayoutHistoryTable rows={payouts.history} caption="Payout history for this event" />
      </PageSection>
    </>
  )
}

/* Figma secondary "_Base Buttons" with icon: 120 × 36, radius 12, 4px gap, 14/20 medium */
const actionClass = 'h-9 min-w-30 gap-1 rounded-lg px-2.75 text-shadow-button [&_svg]:size-4'

/** Figma "Promote Event" / "Track Sales": black/10 border, radius 12, 12px padding, 16px gap. */
function CtaCard({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex min-w-0 cursor-pointer items-center gap-4 rounded-lg border border-default p-2.75 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      <GlassTile src={icon} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-label text-fg">{title}</span>
        <span className="truncate text-body text-fg-muted">{description}</span>
      </span>
    </button>
  )
}

/** Copies text and reports `true` for 2s — feedback for "Copy Link". */
function useCopyFeedback() {
  const [copied, setCopied] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return // clipboard blocked: no false "Copied"
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }
  return [copied, copy]
}

export default EventDashboard
