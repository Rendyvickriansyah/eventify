import { createLocalStore } from '@/lib/localStore'

/*
 * Events the organiser creates through "Add New Event" (#/events/new), persisted in
 * localStorage. The Events list starts empty and only shows these.
 */
const store = createLocalStore('eventify:events', [], Array.isArray)
const read = store.read
let justCreated = null

/** @returns {StoredEvent[]} newest first */
export function getStoredEvents() {
  return read()
}

export function getStoredEvent(id) {
  return read().find((event) => event.id === id) ?? null
}

/**
 * Saves a new event. Throws when storage is full or unavailable (private mode),
 * so the caller can tell the user instead of silently losing the event.
 *
 * @typedef {{ id: string, title: string, category: string, description: string,
 *   banner: string | null, settings: Record<string, boolean>, createdAt: string,
 *   date: string | null, sold: number, capacity: number, priceRange: string | null }} StoredEvent
 * @param {Omit<StoredEvent, 'id' | 'createdAt' | 'date' | 'sold' | 'capacity' | 'priceRange'>} input
 * @returns {StoredEvent}
 */
export function addEvent(input) {
  const event = {
    id: `evt-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    date: null, // scheduled later in "Location & Schedule"
    sold: 0,
    capacity: 0, // no ticket types yet
    priceRange: null,
    ...input,
  }
  store.write([event, ...read()])
  justCreated = { id: event.id, at: Date.now() }
  return event
}

/** Id of the event created in the last few seconds (so the list can highlight it on arrival).
 *  Time-boxed rather than read-once, so StrictMode's double initialiser call is harmless. */
export function takeJustCreated() {
  return justCreated && Date.now() - justCreated.at < 3000 ? justCreated.id : null
}

/** Live list of stored events (re-renders on add, and on changes from other tabs). */
export function useStoredEvents() {
  return store.useStore()
}
