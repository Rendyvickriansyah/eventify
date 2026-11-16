import { createEventCollection } from '@/lib/localStore'

/*
 * Ticket types per event, created through "Add New Ticket" (#/event/:id/tickets/new) and
 * persisted in localStorage as { [eventId]: Ticket[] } (creation order, like the Figma table).
 *
 * @typedef {{ id: string, name: string, description: string, quantity: number, sold: number,
 *   price: number, minPerOrder: number, maxPerOrder: number,
 *   salesStart: string, salesEnd: string,        // "2026-07-01T09:00"
 *   accessCode: string, settings: Record<string, boolean>, createdAt: string }} Ticket
 */
const tickets = createEventCollection('eventify:tickets', 'tkt')

export const getTickets = tickets.get
export const useTickets = tickets.use
export const useAllTickets = tickets.useAll
/** Saves a ticket type; throws when storage is full or unavailable. */
export const addTicket = tickets.add
/** Saves edits to a ticket type; throws when storage is full or unavailable. */
export const updateTicket = tickets.update
export const removeTicket = tickets.remove
export const duplicateTicket = tickets.duplicate
export const takeJustCreatedTicket = tickets.takeJustCreated

/** Capacity, sold and "$min-$max" price range for a set of tickets (null range when empty). */
export function summarizeTickets(list) {
  if (!list.length) return { capacity: 0, sold: 0, priceRange: null }
  const fmt = (n) => `$${n.toLocaleString('en-US')}`
  const prices = list.map((t) => t.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return {
    capacity: list.reduce((sum, t) => sum + t.quantity, 0),
    sold: list.reduce((sum, t) => sum + t.sold, 0),
    priceRange: min === max ? fmt(min) : `${fmt(min)}-${fmt(max)}`,
  }
}
