import { createLocalStore } from '@/lib/localStore'

/*
 * Notification preferences — Figma Account › "Notifications" (node 227:25519).
 * Saved in localStorage as { [eventId]: { inApp, email, slack } }. Everything is on by
 * default, as in the design.
 */

export const notificationChannels = [
  { id: 'inApp', label: 'In-App' },
  { id: 'email', label: 'Email' },
  { id: 'slack', label: 'Slack' },
]

export const notificationGroups = [
  {
    id: 'orders',
    title: 'Orders & Tickets',
    items: [
      { id: 'new-order', label: 'New Order', description: 'Get notified when someone purchases a ticket to your event.' },
      { id: 'order-refunded', label: 'Order Refunded', description: 'Get notified when a buyer requests or receives a refund.' },
      { id: 'pending-payment', label: 'Pending Payment', description: 'Get notified when an order is awaiting payment confirmation.' },
    ],
  },
  {
    id: 'payouts',
    title: 'Payouts & Finance',
    items: [
      { id: 'payout-processed', label: 'Payout Processed', description: 'Get notified when a payout has been successfully transferred.' },
      { id: 'payout-failed', label: 'Payout Failed', description: 'Get notified if a payout request could not be completed.' },
      { id: 'low-balance', label: 'Low Balance Alert', description: 'Get notified when your wallet balance falls below a set threshold.' },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    items: [
      { id: 'event-published', label: 'Event Published', description: 'Get notified when your event goes live and is visible to the public.' },
      { id: 'selling-fast', label: 'Ticket Selling Fast', description: 'Get notified when a ticket tier is nearly sold out.' },
      { id: 'event-reminder', label: 'Event Reminder', description: 'Get notified 24 hours before your event starts.' },
    ],
  },
  {
    id: 'checkin',
    title: 'Check-in',
    items: [
      { id: 'checkin-started', label: 'Check-in Started', description: 'Get notified when the first attendee scans in at your event.' },
      { id: 'failed-scan', label: 'Failed Scan Detected', description: 'Get notified when an invalid or duplicate ticket scan is detected.' },
    ],
  },
]

const allOn = Object.fromEntries(notificationChannels.map((c) => [c.id, true]))
export const defaultNotificationPrefs = Object.fromEntries(
  notificationGroups.flatMap((g) => g.items.map((item) => [item.id, allOn])),
)

const store = createLocalStore('eventify:notifications', defaultNotificationPrefs, (v) => typeof v === 'object' && !Array.isArray(v))

/** Saved preferences, with defaults filled in for any event added since. */
export function getNotificationPrefs() {
  const saved = store.read()
  return Object.fromEntries(
    Object.entries(defaultNotificationPrefs).map(([id, channels]) => [id, { ...channels, ...saved[id] }]),
  )
}

export function saveNotificationPrefs(prefs) {
  store.write(prefs)
}
