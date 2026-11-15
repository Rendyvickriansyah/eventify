/*
 * Mock content for the Event Dashboard — Figma node 175:16349 ("Overview").
 * `evt-102` carries the Figma ticket types verbatim (Court Side … Upper Stand). Other events
 * get tiers derived from their list row (sold / capacity / price range) so every
 * "View More" opens a consistent page. Replace with API data later.
 */
import { upcomingEvents, pastEvents } from './events'
import { getStoredEvent, getStoredEvents } from './eventStore'
import { getTickets, summarizeTickets } from './ticketStore'

const allEvents = [
  ...upcomingEvents.map((e) => ({ ...e, status: 'upcoming' })),
  ...pastEvents.map((e) => ({ ...e, status: 'past' })),
]

/** Event switcher options: the organiser's own (stored) events first, then the demo events. */
export function getEventOptions() {
  return [...getStoredEvents(), ...allEvents].map(({ id, title }) => ({ id, title }))
}

const figmaTicketTypes = {
  'evt-102': [
    { id: 'court', name: 'Court Side', sold: 250, capacity: 500, price: 150 },
    { id: 'ring', name: 'Ring Side', sold: 750, capacity: 1500, price: 95 },
    { id: 'grand', name: 'Grand Stand', sold: 1000, capacity: 3000, price: 45 },
    { id: 'upper', name: 'Upper Stand', sold: 2900, capacity: 5000, price: 20 },
  ],
}

/* Generic tiers: capacity share, relative sell-through, price position in the range */
const tiers = [
  { id: 'vip', name: 'VIP', share: 0.1, pace: 1.25, pricePos: 1 },
  { id: 'premium', name: 'Premium', share: 0.2, pace: 1.1, pricePos: 0.5 },
  { id: 'regular', name: 'Regular', share: 0.3, pace: 1, pricePos: 0.2 },
  { id: 'economy', name: 'Economy', share: 0.4, pace: 0.85, pricePos: 0 },
]

function deriveTicketTypes({ sold, capacity, priceRange }) {
  const [min, max] = priceRange.match(/\d+/g).map(Number)
  const ratio = capacity ? sold / capacity : 0
  return tiers.map((tier) => {
    const cap = Math.round(capacity * tier.share)
    return {
      id: tier.id,
      name: tier.name,
      capacity: cap,
      sold: Math.min(cap, Math.round(cap * Math.min(ratio * tier.pace, 1))),
      price: Math.round(min + (max - min) * tier.pricePos),
    }
  })
}

const buyers = ['James Donovan', 'Sari Wulandari', 'Michael Tan', 'Ayu Pratiwi', 'Daniel Hartono', 'Nadia Putri']
const PAID = { label: 'Paid', tone: 'success' }
const PENDING = { label: 'Pending', tone: 'warning' }
const REFUNDED = { label: 'Refunded', tone: 'neutral' }
/* 8 most recent orders (Figma Orders tab); the Overview shows the first 4 */
const payments = [PAID, PAID, PENDING, PAID, PAID, REFUNDED, PAID, PAID]

function recentOrdersFor(eventIndex, ticketTypes) {
  return payments.map((payment, i) => {
    const type = ticketTypes[(eventIndex + i) % ticketTypes.length]
    const qty = ((eventIndex + i * 3) % 4) + 1
    return {
      id: `#ORD-${2041 - i - eventIndex * 10}`,
      buyer: buyers[(eventIndex + i) % buyers.length],
      ticket: `${qty}x ${type.name}`,
      total: `$${(qty * type.price).toLocaleString('en-US')}`,
      payment,
    }
  })
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const int = new Intl.NumberFormat('en-US')
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/*
 * Event payouts (Figma node 182:18952): earnings = revenue minus a 10% platform fee, paid out
 * monthly for the four months before the event (newest month largest), on the 3rd of the next
 * month. Whatever has not been paid out yet is the pending payout.
 */
const PLATFORM_FEE = 0.1
const payoutWeights = [0.35, 0.25, 0.15, 0.1]
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function payoutsFor(eventIndex, eventDate, revenue) {
  const earnings = Math.round(revenue * (1 - PLATFORM_FEE) * 100) / 100
  const start = new Date(`${eventDate}T00:00:00Z`)
  const history = payoutWeights.map((weight, i) => {
    const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1 - i, 1))
    const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate()
    const paidOn = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 3))
    return {
      id: `#PAY-${String(41 - i + eventIndex * 4).padStart(4, '0')}`,
      period: `${shortMonth.format(monthStart)} 1–${lastDay}, ${monthStart.getUTCFullYear()}`,
      value: Math.round(earnings * weight * 100) / 100,
      status: { label: 'Completed', tone: 'success' },
      date: shortDate.format(paidOn),
    }
  })
  const paid = history.reduce((sum, p) => sum + p.value, 0)
  const pending = Math.max(earnings - paid, 0)
  const ratio = earnings ? paid / earnings : 0

  return {
    metrics: [
      { id: 'earnings', label: 'Total Earnings', value: money.format(earnings), trend: { direction: 'neutral', value: '10%', context: 'fee deducted' } },
      { id: 'paid', label: 'Already Paid Out', value: money.format(paid), trend: { direction: 'neutral', value: pct.format(ratio), context: 'of earnings' } },
      { id: 'pending', label: 'Pending Payout', value: money.format(pending), trend: { direction: 'neutral', value: '', context: 'Paid out after the event' } },
    ],
    account: { id: 'main-wallet', title: 'Main Wallet', subtitle: 'James Alexander', currency: 'USD' },
    history: history.map(({ value, ...row }) => ({ ...row, amount: money.format(value) })),
  }
}

/*
 * Order totals (Figma node 185:21731): orders ≈ tickets sold / 1.8 tickets per order, split
 * like the Figma sample (3,401 paid · 311 pending · 200 refunded of 3,912 ≈ 87 / 8 / 5 %).
 */
const TICKETS_PER_ORDER = 1.8
function orderMetrics(ticketsSold) {
  const total = Math.round(ticketsSold / TICKETS_PER_ORDER)
  const pending = Math.round(total * 0.08)
  const refunded = Math.round(total * 0.05)
  const paid = total - pending - refunded
  const share = (n) => pct.format(total ? n / total : 0)
  return [
    { id: 'total', label: 'Total Orders', value: int.format(total), trend: { direction: 'neutral', value: String(TICKETS_PER_ORDER), context: 'tickets / order' } },
    { id: 'paid', label: 'Paid Orders', value: int.format(paid), trend: { direction: 'neutral', value: share(paid), context: 'of orders' } },
    { id: 'pending', label: 'Pending', value: int.format(pending), trend: { direction: 'neutral', value: share(pending), context: 'awaiting payment' } },
    { id: 'refunded', label: 'Refunded', value: int.format(refunded), trend: { direction: 'neutral', value: share(refunded), context: 'of orders' } },
  ]
}

/*
 * Check-in (Figma node 185:22149). The Figma screen shows gates mid-event, so the Figma event
 * (evt-102) is treated as live: gates open, check-ins in progress. Other events show either
 * scheduled gates (upcoming) or closed gates with final counts (past).
 */
const LIVE_EVENT_ID = 'evt-102'
const gateTemplates = [
  { id: 'gate-a', name: 'Gate A', type: 'Entry Only Gate', location: 'North Entrance', pic: 'Marcus', share: 0.45, scan: '3.2s', lastLive: '2 mins ago' },
  { id: 'gate-b', name: 'Gate B', type: 'Entry & Exit Gate', location: 'South Entrance', pic: 'Dewi', share: 0.4, scan: '2.8s', lastLive: 'Just now' },
  { id: 'gate-c', name: 'Gate C', type: 'VIP Entry Gate', location: 'VIP Lounge', pic: 'Rizky', share: 0.15, scan: '4.1s', lastLive: '6 mins ago' },
]
const gateDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

function checkinFor(status, eventDate, sold) {
  const opensAt = `${gateDate.format(new Date(`${eventDate}T00:00:00Z`)).replace(/ (\d{4})$/, ', $1')} at 5:00 PM`
  const progress = { live: 0.58, past: 0.93, upcoming: 0 }[status]
  const gates = gateTemplates.map((g) => {
    const expected = Math.round(sold * g.share)
    const checkedIn = Math.round(expected * progress)
    return {
      id: g.id,
      name: g.name,
      type: g.type,
      opensAt: `Open Gate at ${opensAt}`,
      status: { live: { label: 'Active', tone: 'success' }, past: { label: 'Closed', tone: 'neutral' }, upcoming: { label: 'Scheduled', tone: 'neutral' } }[status],
      location: g.location,
      pic: g.pic,
      checkedIn,
      expected,
      failed: Math.round(checkedIn * 0.012),
      scanTime: status === 'upcoming' ? '—' : g.scan,
      lastActivity: { live: g.lastLive, past: 'Event ended', upcoming: 'Not opened yet' }[status],
    }
  })
  const total = gates.reduce((sum, g) => sum + g.checkedIn, 0)
  const failed = gates.reduce((sum, g) => sum + g.failed, 0)
  const open = status === 'live' ? gates.length : 0
  return {
    total,
    gates,
    metrics: [
      { id: 'total', label: 'Total Checked-in', value: int.format(total), trend: { direction: 'neutral', value: pct.format(sold ? total / sold : 0), context: 'of tickets' } },
      { id: 'peak', label: 'Peak Minute', value: int.format(Math.round(total * 0.065)), trend: { direction: 'neutral', value: '', context: 'check-ins / min' } },
      { id: 'open', label: 'Open Gates', value: String(open), trend: { direction: 'neutral', value: '', context: status === 'live' ? `of ${gates.length} gates` : status === 'past' ? 'All gates closed' : `Opens ${opensAt}` } },
      { id: 'failed', label: 'Failed Scans', value: int.format(failed), trend: { direction: 'neutral', value: pct.format(total ? failed / (total + failed) : 0), context: 'of scans' } },
    ],
  }
}

/* Settings (Figma node 184:20347) — defaults per event; list categories map onto the settings options. */
const categoryAlias = { Sports: 'Sports & Fitness' }
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function settingsFor(event) {
  return {
    general: {
      name: event.title,
      category: categoryAlias[event.category] ?? event.category,
      status: 'published',
      language: 'English',
      currency: 'USD',
      timezone: 'Asia/Jakarta',
      slug: slugify(event.title),
    },
    fees: {
      feeModel: 'buyer',
      serviceFee: '3%',
      processingFee: '2%',
      taxLabel: 'VAT',
      taxRate: '11%',
      taxIncluded: 'yes',
    },
  }
}

/*
 * A just-created event (eventStore): no date, no ticket types, no sales yet — every figure
 * is zero and the lists are empty rather than borrowing the demo data.
 */
function newEventDetail(event) {
  const tickets = getTickets(event.id)
  const zero = (id, label, context) => ({ id, label, value: '0', trend: { direction: 'neutral', value: '', context } })
  return {
    id: event.id,
    demo: false,
    title: event.title,
    status: 'upcoming',
    when: 'Date not set yet',
    metrics: [
      { ...zero('revenue', 'Total Revenue', 'No sales yet'), value: usd.format(0) },
      { ...zero('sold', 'Tickets Sold', tickets.length ? `of ${summarizeTickets(tickets).capacity.toLocaleString('en-US')} available` : 'Add ticket types to start selling') },
      zero('checkins', 'Check-ins', 'Opens on event day'),
    ],
    checkin: {
      total: 0,
      gates: [],
      metrics: [
        zero('total', 'Total Checked-in', 'No check-ins yet'),
        zero('peak', 'Peak Minute', 'check-ins / min'),
        zero('open', 'Open Gates', 'No gates set up'),
        zero('failed', 'Failed Scans', 'of scans'),
      ],
    },
    settings: settingsFor(event),
    ticketTypes: tickets.map((t) => ({ id: t.id, name: t.name, sold: t.sold, capacity: t.quantity, price: t.price })),
    recentOrders: [],
    orderMetrics: orderMetrics(0),
    payouts: {
      metrics: [
        { ...zero('earnings', 'Total Earnings', 'fee deducted'), value: money.format(0) },
        { ...zero('paid', 'Already Paid Out', 'of earnings'), value: money.format(0) },
        { ...zero('pending', 'Pending Payout', 'Paid out after the event'), value: money.format(0) },
      ],
      account: { id: 'main-wallet', title: 'Main Wallet', subtitle: 'James Alexander', currency: 'USD' },
      history: [],
    },
  }
}

/** @returns {null | object} the event dashboard model for `id` */
export function getEventDetail(id) {
  const stored = getStoredEvent(id)
  if (stored) return newEventDetail(stored)
  const index = allEvents.findIndex((e) => e.id === id)
  if (index < 0) return null
  const event = allEvents[index]
  const ticketTypes = figmaTicketTypes[id] ?? deriveTicketTypes(event)

  const sold = ticketTypes.reduce((sum, t) => sum + t.sold, 0)
  const capacity = ticketTypes.reduce((sum, t) => sum + t.capacity, 0)
  const revenue = ticketTypes.reduce((sum, t) => sum + t.sold * t.price, 0)
  const status = id === LIVE_EVENT_ID ? 'live' : event.status
  const checkin = checkinFor(status, event.date, sold)

  return {
    id,
    demo: true,
    title: event.title,
    date: event.date,
    status,
    when: `${longDate.format(new Date(`${event.date}T00:00:00Z`))} at 7:00 PM`,
    metrics: [
      { id: 'revenue', label: 'Total Revenue', value: usd.format(revenue), trend: { direction: 'neutral', value: usd.format(revenue / Math.max(sold, 1)), context: 'avg. ticket' } },
      { id: 'sold', label: 'Tickets Sold', value: int.format(sold), trend: { direction: 'neutral', value: pct.format(capacity ? sold / capacity : 0), context: 'of capacity' } },
      status === 'upcoming'
        ? { id: 'checkins', label: 'Check-ins', value: '0', trend: { direction: 'neutral', value: '', context: 'Opens on event day' } }
        : { id: 'checkins', label: 'Check-ins', value: int.format(checkin.total), trend: { direction: 'neutral', value: pct.format(sold ? checkin.total / sold : 0), context: 'of tickets' } },
    ],
    checkin,
    settings: settingsFor(event),
    ticketTypes,
    recentOrders: recentOrdersFor(index, ticketTypes),
    orderMetrics: orderMetrics(sold),
    payouts: payoutsFor(index, event.date, revenue),
  }
}

/** Event-scoped sidebar — Figma event "Sidebar" (no footer links). */
export function eventNavigation(id) {
  const base = `#/event/${id}`
  return {
    groups: [
      { id: 'general', title: 'GENERAL', items: [{ id: 'overview', label: 'Event Dashboard', href: base }] },
      {
        id: 'ticket',
        title: 'TICKET',
        items: [
          { id: 'schedule', label: 'Location & Schedule', href: `${base}/schedule` },
          { id: 'tickets', label: 'Ticket List', href: `${base}/tickets` },
          { id: 'vouchers', label: 'E-Voucher', href: `${base}/vouchers` },
          { id: 'seating', label: 'Seating Chart', href: `${base}/seating` },
        ],
      },
      {
        id: 'purchasing',
        title: 'PURCHASING',
        items: [
          { id: 'orders', label: 'Orders', href: `${base}/orders` },
          { id: 'attendees', label: 'Attendees', href: `${base}/attendees` },
          { id: 'promo', label: 'Discount & Promo Code', href: `${base}/promo` },
        ],
      },
      { id: 'settings', title: 'SETTINGS', items: [{ id: 'team', label: 'Team & Access', href: `${base}/team` }] },
    ],
  }
}

export const eventTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'orders', label: 'Orders' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'settings', label: 'Settings' },
]
