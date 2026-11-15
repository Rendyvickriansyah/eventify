import { useMemo } from 'react'
import { createLocalStore } from '@/lib/localStore'
import { parseCsv, csvCell } from '@/lib/csv'
import rizkyPhoto from '@/assets/avatars/rizky-aditya.jpg'

/*
 * Attendees per event — Figma "Attendees" (node 220:20956) + "Attendee Details" sheet (306:31489).
 *
 * Mock: a deterministic list per event (same people every visit), sized from tickets sold and
 * split across the event's ticket types; check-ins follow the event's own check-in progress.
 * What the organiser changes — check-ins, refunds, CSV imports — is kept in localStorage and
 * laid over that list.
 *
 * @typedef {{
 *   id: string, name: string, email: string, photo?: string,
 *   ticketTypeId: string, ticketType: string, quantity: number, accessLevel: string,
 *   orderId: string, seat: string, gate: string,
 *   payment: 'Paid' | 'Pending' | 'Refunded',
 *   checkedInAt: string | null,          // ISO
 *   addOns: { name: string, quantity: number }[],
 *   imported?: boolean,
 * }} Attendee
 */

const store = createLocalStore('eventify:attendees', {}, (v) => typeof v === 'object' && !Array.isArray(v))
const EMPTY = {}

// The design's people first, then a wider pool
const figmaNames = ['Andika Pratama', 'Rizky Aditya', 'Citra Dewi', 'Bintang Wahyu', 'Nabila Putri', 'Sinta Maharani', 'Dimas Saputra', 'Melati Anggraini', 'Farhan Akbar']
const first = ['Ayu', 'Bagus', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oktaviani', 'Putra', 'Rani', 'Satria', 'Tiara', 'Umar', 'Vina', 'Wahyu', 'Yoga', 'Zahra', 'Adit', 'Bella', 'Cahya']
const last = ['Saputra', 'Lestari', 'Wijaya', 'Hidayat', 'Kusuma', 'Pratama', 'Santoso', 'Purnama', 'Siregar', 'Nugroho', 'Halim', 'Permata', 'Setiawan', 'Rahman', 'Utami', 'Gunawan']
const addOnPool = ['VIP Parking Pass', 'Match Day Meal', 'Shuttle Bus Pass', 'Official Merchandise']

function seeded(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const gateFor = (ticket, i) => (/vip|court|premium/i.test(ticket) ? 'Gate C' : i % 2 ? 'Gate B' : 'Gate A')

/** The generated list for an event (before the organiser's changes). */
function baseAttendees(event) {
  const types = event.ticketTypes.filter((t) => t.sold > 0)
  const sold = types.reduce((n, t) => n + t.sold, 0)
  if (!sold) return []
  const rand = seeded(event.id)
  const count = Math.min(sold, 486)
  const checkinRate = event.status === 'upcoming' ? 0 : sold ? event.checkin.total / sold : 0
  const used = new Map()
  const list = []
  for (let i = 0; i < count; i++) {
    // ticket type weighted by what each sold
    let r = rand() * sold
    const type = types.find((t) => (r -= t.sold) < 0) ?? types[0]
    const ti = event.ticketTypes.indexOf(type)
    const name = i < figmaNames.length ? figmaNames[i] : `${first[Math.floor(rand() * first.length)]} ${last[Math.floor(rand() * last.length)]}`
    const base = name.toLowerCase().replace(/[^a-z]+/g, '.')
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    const p = rand()
    const payment = p < 0.9 ? 'Paid' : p < 0.96 ? 'Pending' : 'Refunded'
    const checkedIn = payment === 'Paid' && rand() < checkinRate
    const minutes = 16 * 60 + Math.floor(rand() * 210) // 16:00 – 19:30
    const addOns = []
    if (rand() < 0.35) addOns.push({ name: addOnPool[Math.floor(rand() * 2)], quantity: 1 + Math.floor(rand() * 2) })
    if (rand() < 0.15) addOns.push({ name: addOnPool[2 + Math.floor(rand() * 2)], quantity: 1 })
    list.push({
      id: `att-${i + 1}`,
      name,
      email: `${base}${n ? n + 1 : ''}@mail.com`,
      ...(name === 'Rizky Aditya' && n === 0 && { photo: rizkyPhoto }),
      ticketTypeId: type.id,
      ticketType: type.name,
      quantity: rand() < 0.75 ? 1 : 2 + Math.floor(rand() * 2),
      accessLevel: `${type.name} Access`,
      orderId: `#ORD-${String(1284 + i * 3 + Math.floor(rand() * 3)).padStart(6, '0')}`,
      seat: `${'ABCDEFGH'[ti % 8]}-${1 + Math.floor(rand() * 40)}`,
      gate: gateFor(type.name, i),
      payment,
      checkedInAt: checkedIn && event.date ? `${event.date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00` : null,
      addOns: addOns.filter((a, k) => addOns.findIndex((b) => b.name === a.name) === k),
    })
  }
  // The design's sample sheet (Rizky Aditya): order, quantity and add-ons as drawn
  const rizky = list.find((a) => a.photo)
  if (rizky) Object.assign(rizky, { orderId: '#ORD-001284', quantity: 2, addOns: [{ name: 'VIP Parking Pass', quantity: 1 }, { name: 'Match Day Meal', quantity: 2 }] })
  return list
}

/** Live list for an event: generated attendees + imports, with check-ins / refunds applied. */
export function useAttendees(event) {
  const saved = store.useStore((all) => all[event?.id] ?? EMPTY)
  const base = useMemo(() => (event ? baseAttendees(event) : []), [event])
  return useMemo(() => {
    const changes = saved.changes ?? EMPTY
    return [...base, ...(saved.imported ?? [])].map((a) => (changes[a.id] ? { ...a, ...changes[a.id] } : a))
  }, [base, saved])
}

function patchEvent(eventId, fn) {
  const all = store.read()
  store.write({ ...all, [eventId]: fn(all[eventId] ?? {}) })
}

/** Check in (now) or undo; throws when storage is unavailable. */
export function setCheckIn(eventId, attendeeId, checkedIn) {
  patchEvent(eventId, (e) => ({
    ...e,
    changes: { ...e.changes, [attendeeId]: { ...e.changes?.[attendeeId], checkedInAt: checkedIn ? new Date().toISOString() : null } },
  }))
}

export function refundAttendee(eventId, attendeeId) {
  patchEvent(eventId, (e) => ({
    ...e,
    changes: { ...e.changes, [attendeeId]: { ...e.changes?.[attendeeId], payment: 'Refunded', checkedInAt: null } },
  }))
}

/**
 * Adds attendees from a CSV (header row with at least "name"; "email", "ticket type", "seat"
 * optional, any order). Unknown ticket types fall back to the first one.
 * @returns {number} how many were added
 */
export function importAttendees(event, csvText) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) throw new Error('empty')
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = (names) => header.findIndex((h) => names.includes(h))
  const iName = col(['name', 'attendee name', 'full name'])
  if (iName < 0) throw new Error('no-name')
  const iEmail = col(['email', 'e-mail'])
  const iType = col(['ticket type', 'ticket', 'type'])
  const iSeat = col(['seat'])
  const stamp = Date.now().toString(36)
  const added = rows.slice(1).filter((r) => r[iName]?.trim()).map((r, k) => {
    const typeName = iType >= 0 ? r[iType]?.trim() : ''
    const type = event.ticketTypes.find((t) => t.name.toLowerCase() === typeName.toLowerCase()) ?? event.ticketTypes[0]
    const name = r[iName].trim()
    return {
      id: `imp-${stamp}-${k}`,
      name,
      email: (iEmail >= 0 && r[iEmail]?.trim()) || '',
      ticketTypeId: type?.id ?? 'imported',
      ticketType: type?.name ?? (typeName || 'General'),
      quantity: 1,
      accessLevel: `${type?.name ?? 'General'} Access`,
      orderId: '—',
      seat: (iSeat >= 0 && r[iSeat]?.trim()) || '—',
      gate: gateFor(type?.name ?? '', k),
      payment: 'Paid',
      checkedInAt: null,
      addOns: [],
      imported: true,
    }
  })
  if (!added.length) throw new Error('empty')
  patchEvent(event.id, (e) => ({ ...e, imported: [...(e.imported ?? []), ...added] }))
  return added.length
}



/** CSV of the given attendees (what the table shows, plus the sheet's details). */
export function attendeesCsv(list) {
  const header = ['Name', 'Email', 'Ticket Type', 'Quantity', 'Seat', 'Gate', 'Order ID', 'Payment', 'Check-in Status', 'Check-in Time', 'Add-ons']
  const lines = list.map((a) => [
    a.name, a.email, a.ticketType, a.quantity, a.seat, a.gate, a.orderId, a.payment,
    a.checkedInAt ? 'Checked-in' : 'Not checked-in', a.checkedInAt ?? '',
    a.addOns.map((x) => `${x.name} ×${x.quantity}`).join('; '),
  ].map(csvCell).join(','))
  return [header.join(','), ...lines].join('\n')
}

const checkinFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
/** "17 May 2026, 16:05" */
export const formatCheckIn = (iso) => (iso ? checkinFormat.format(new Date(iso)).replace(' at ', ', ') : '—')
