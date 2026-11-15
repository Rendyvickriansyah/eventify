import { useSyncExternalStore } from 'react'

/**
 * A tiny persisted store: JSON in localStorage under `key`, a cached snapshot for
 * useSyncExternalStore, and cross-tab sync through the `storage` event.
 * `write` throws if storage is full or unavailable, so callers can tell the user.
 *
 * @template T
 * @param {string} key
 * @param {T} fallback   value when nothing (or something unreadable) is stored
 * @param {(value: unknown) => boolean} [isValid]
 */
export function createLocalStore(key, fallback, isValid = () => true) {
  const listeners = new Set()
  let cache = null

  function read() {
    if (cache !== null) return cache
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? 'null')
      cache = parsed !== null && isValid(parsed) ? parsed : fallback
    } catch {
      cache = fallback
    }
    return cache
  }

  function write(next) {
    localStorage.setItem(key, JSON.stringify(next))
    cache = next
    listeners.forEach((l) => l())
  }

  function subscribe(listener) {
    listeners.add(listener)
    const onStorage = (e) => {
      if (e.key !== key) return
      cache = null
      listener()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  /** @param {(value: T) => any} [select] must return a stable reference for the same snapshot */
  function useStore(select = (v) => v) {
    return useSyncExternalStore(subscribe, () => select(read()), () => select(fallback))
  }

  return { read, write, subscribe, useStore }
}

/**
 * Per-event collections on top of createLocalStore — `{ [eventId]: Item[] }` in creation
 * order. Used for ticket types and add-ons.
 *
 * @param {string} key        localStorage key
 * @param {string} idPrefix   e.g. "tkt"
 */
export function createEventCollection(key, idPrefix) {
  const store = createLocalStore(key, {}, (v) => typeof v === 'object' && !Array.isArray(v))
  const EMPTY = []
  let justCreated = null

  const get = (eventId) => store.read()[eventId] ?? EMPTY

  function add(eventId, input) {
    const item = { id: `${idPrefix}-${Date.now().toString(36)}`, sold: 0, createdAt: new Date().toISOString(), ...input }
    const all = store.read()
    store.write({ ...all, [eventId]: [...(all[eventId] ?? []), item] })
    justCreated = { id: item.id, at: Date.now() }
    return item
  }

  return {
    get,
    add,
    /** Live list for one event. */
    use: (eventId) => store.useStore((all) => all[eventId] ?? EMPTY),
    /** Live map of every event's items. */
    useAll: () => store.useStore(),
    /** Merges `patch` into one item and stamps `updatedAt`; returns the updated item. */
    update(eventId, itemId, patch) {
      const all = store.read()
      let updated = null
      const list = (all[eventId] ?? []).map((t) => (t.id === itemId ? (updated = { ...t, ...patch, updatedAt: new Date().toISOString() }) : t))
      store.write({ ...all, [eventId]: list })
      return updated
    },
    remove(eventId, itemId) {
      const all = store.read()
      store.write({ ...all, [eventId]: (all[eventId] ?? []).filter((t) => t.id !== itemId) })
    },
    duplicate(eventId, itemId) {
      const source = get(eventId).find((t) => t.id === itemId)
      if (!source) return null
      const { id: _id, sold: _sold, createdAt: _createdAt, ...rest } = source
      return add(eventId, { ...rest, name: `Copy of ${source.name}` })
    },
    /** Id created in the last few seconds (lists highlight it); StrictMode-safe. */
    takeJustCreated: () => (justCreated && Date.now() - justCreated.at < 3000 ? justCreated.id : null),
  }
}
