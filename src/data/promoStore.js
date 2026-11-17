import { createEventCollection } from '@/lib/localStore'
import { parseCsv } from '@/lib/csv'

/*
 * Discount & promo codes per event — Figma "Discount & Promo Code" (empty 267:32502, table
 * 268:33680, details 270:33157). Persisted in localStorage as { [eventId]: PromoCode[] };
 * the Figma event (evt-102) also shows the design's sample codes.
 *
 * @typedef {{ id: string, code: string, type: 'percentage' | 'fixed', value: number,
 *   used: number, maxUsage: number | null,            // null = unlimited (∞)
 *   start: string | null, end: string | null,          // 'YYYY-MM-DD'; both null = all time
 *   startTime?: string | null, endTime?: string | null, // 'HH:MM' picked with the date (display only)
 *   active: boolean, createdAt: string, demo?: boolean }} PromoCode
 */
const promos = createEventCollection('eventify:promos', 'promo')

export const usePromoCodes = promos.use
export const getPromoCodes = promos.get
/** Saves a code; throws when storage is full or unavailable. */
export const addPromoCode = promos.add
export const updatePromoCode = promos.update
export const removePromoCode = promos.remove
export const takeJustCreatedPromo = promos.takeJustCreated

const DAY = 86_400_000
const iso = (d) => new Date(d).toISOString().slice(0, 10)
/** Today in the browser's calendar, as 'YYYY-MM-DD'. */
export const today = () => iso(Date.now() - new Date().getTimezoneOffset() * 60_000)
const rel = (days) => iso(Date.parse(today()) + days * DAY)

/* Figma's sample codes, dated around today so their state reads true. */
const demoRows = [
  ['EARLY50', 'percentage', 50, 250, 500, -5, 26, true],
  ['VIP100', 'fixed', 100, 34, 50, -2, 8, true],
  ['GROUP10', 'percentage', 10, 88, null, null, null, true],
  ['WELCOME25', 'fixed', 25, 15, 100, 0, 6, true],
  ['FLASH30', 'percentage', 30, 200, 200, -1, -1, true],
  ['SPONSOR75', 'fixed', 75, 12, 30, -7, 13, true],
  ['STU20', 'percentage', 20, 56, 150, -14, 16, true],
  ['BUNDLE40', 'fixed', 40, 24, 60, -4, 6, true],
  ['LASTCALL15', 'percentage', 15, 180, 180, 1, 2, false],
  ['FRIEND50', 'fixed', 50, 9, null, null, null, true],
]
export function demoPromoCodes(eventId) {
  if (eventId !== 'evt-102') return []
  return demoRows.map(([code, type, value, used, maxUsage, s, e, active]) => ({
    id: `demo-${code.toLowerCase()}`, code, type, value, used, maxUsage,
    start: s == null ? null : rel(s), end: e == null ? null : rel(e), active, demo: true, createdAt: rel(-30),
  }))
}

/**
 * Puts the sample codes in storage the first time the Figma event is opened, so they can be
 * edited, switched off and deleted like any other (a marker keeps deleted ones from returning).
 */
export function ensureDemoPromoCodes(eventId) {
  const key = `eventify:promos-seeded:${eventId}`
  try {
    if (localStorage.getItem(key)) return
    const demos = demoPromoCodes(eventId)
    if (!demos.length) return
    for (const d of demos) addPromoCode(eventId, d)
    localStorage.setItem(key, '1')
  } catch { /* storage unavailable — the page just starts empty */ }
}

/* ── Formatting & state ───────────────────────────────────── */

const usd = (n) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
export const typeLabel = { percentage: 'Percentage', fixed: 'Fixed Amount' }
export const formatValue = (p) => (p.type === 'percentage' ? `${p.value}%` : usd(p.value))
export const formatUsage = (p) => `${p.used.toLocaleString('en-US')} / ${p.maxUsage == null ? '∞' : p.maxUsage.toLocaleString('en-US')}`

const dShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' })
const dMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dFull = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dLong = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const at = (d) => new Date(`${d}T00:00:00Z`)

/** Table "Validity": "1–15 May 2026", "28 May – 3 Jun 2026", "14 May 2026", "From 1 May 2026", "All Time". */
export function formatValidity(p) {
  if (!p.start && !p.end) return 'All Time'
  if (p.start && !p.end) return `From ${dFull.format(at(p.start))}`
  if (!p.start) return `Until ${dFull.format(at(p.end))}`
  if (p.start === p.end) return dFull.format(at(p.start))
  const [s, e] = [at(p.start), at(p.end)]
  if (s.getUTCFullYear() !== e.getUTCFullYear()) return `${dFull.format(s)} – ${dFull.format(e)}`
  if (s.getUTCMonth() === e.getUTCMonth()) return `${dShort.format(s)}–${dFull.format(e)}`
  return `${dMonth.format(s)} – ${dFull.format(e)}`
}
/** Details stats: "May 10, 2026" or "—". */
export const formatLongDate = (d) => (d ? dLong.format(at(d)) : '—')

export const isUsedUp = (p) => p.maxUsage != null && p.used >= p.maxUsage

/**
 * What buyers experience right now. Figma shows Active / Disabled; switched-off and used-up
 * codes are "Disabled", and the calendar adds "Scheduled" / "Expired".
 * @returns {{ label: string, tone: 'success' | 'danger' | 'neutral' | 'info', key: string }}
 */
export function promoStatus(p, now = today()) {
  if (!p.active) return { key: 'disabled', label: 'Disabled', tone: 'danger' }
  if (isUsedUp(p)) return { key: 'disabled', label: 'Disabled', tone: 'danger' }
  if (p.end && p.end < now) return { key: 'expired', label: 'Expired', tone: 'neutral' }
  if (p.start && p.start > now) return { key: 'scheduled', label: 'Scheduled', tone: 'info' }
  return { key: 'active', label: 'Active', tone: 'success' }
}

/** Validity filter bucket. */
export function validityOf(p, now = today()) {
  if (!p.start && !p.end) return 'all-time'
  if (p.end && p.end < now) return 'ended'
  if (p.start && p.start > now) return 'upcoming'
  return 'ongoing'
}

/** Usage filter bucket. */
export function usageOf(p) {
  if (!p.used) return 'unused'
  if (p.maxUsage == null) return 'some'
  const r = p.used / p.maxUsage
  return r >= 1 ? 'full' : r >= 0.5 ? 'most' : 'some'
}

/* ── Usage history (mock, deterministic per code) ─────────── */

const buyers = ['Rizky Aditya', 'Citra Dewi', 'Bintang Wahyu', 'Nabila Putri', 'Andika Pratama', 'Sinta Maharani', 'Dimas Saputra', 'Melati Anggraini', 'Farhan Akbar', 'Aulia Rahman', 'Bagus Wijaya', 'Indah Lestari', 'Yoga Pratama', 'Zahra Kusuma']

function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let t = Math.imul(h ^ (h >>> 15), h | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One row per redemption (newest first): order, buyer, ticket, discount, totals, date.
 * @param {PromoCode} p
 * @param {{ id: string, name: string, price: number }[]} ticketTypes
 */
export function usageHistory(p, ticketTypes) {
  const rand = seeded(p.id)
  const types = ticketTypes.length ? ticketTypes : [{ id: 'general', name: 'General', price: 50 }]
  const first = Date.parse(p.start ?? p.createdAt.slice(0, 10))
  const last = Math.min(Date.parse(p.end ?? today()), Date.parse(today()))
  return Array.from({ length: Math.min(p.used, 500) }, (_, i) => {
    const type = types[Math.floor(rand() * types.length)]
    const qty = rand() < 0.6 ? 1 : 2
    const before = type.price * qty
    const discount = Math.min(before, p.type === 'percentage' ? Math.round((before * p.value) / 100) : p.value)
    const when = last - Math.floor(((last - first) / Math.max(1, p.used)) * i) - Math.floor(rand() * DAY)
    return {
      id: `${p.id}-${i}`,
      orderId: `#ORD-${String(1284 - i).padStart(6, '0')}`,
      buyer: buyers[(i + Math.floor(rand() * 3)) % buyers.length],
      ticketType: type.name,
      discount: usd(discount),
      before: usd(before),
      after: usd(before - discount),
      redeemedAt: dFull.format(new Date(Math.max(first, when))),
    }
  })
}

/* ── CSV import ───────────────────────────────────────────── */

const CODE_RE = /^[A-Z0-9_-]{3,20}$/

/**
 * Imports codes from a CSV with a header row: code (required), type (percentage / fixed),
 * value, max usage, start, end (YYYY-MM-DD), any order. Rows whose code already exists are skipped.
 * @returns {{ added: number, skipped: number }}
 */
export function importPromoCodes(eventId, csvText, existing) {
  const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) throw new Error('empty')
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = (names) => header.findIndex((h) => names.includes(h))
  const iCode = col(['code', 'promo code', 'coupon code'])
  if (iCode < 0) throw new Error('no-code')
  const iType = col(['type', 'discount type'])
  const iValue = col(['value', 'discount value', 'discount'])
  const iMax = col(['max usage', 'max', 'limit', 'usage limit'])
  const iStart = col(['start', 'start date'])
  const iEnd = col(['end', 'end date'])
  const taken = new Set(existing.map((p) => p.code))
  let added = 0
  let skipped = 0
  for (const r of rows.slice(1)) {
    const code = r[iCode]?.trim().toUpperCase()
    const value = Number(String(r[iValue] ?? '').replace(/[^0-9.]/g, ''))
    if (!code || !CODE_RE.test(code) || taken.has(code) || !(value > 0)) { skipped++; continue }
    const type = /fix|amount|\$/i.test(r[iType] ?? '') ? 'fixed' : 'percentage'
    const max = Number(String(r[iMax] ?? '').replace(/[^0-9]/g, ''))
    const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v?.trim() ?? '') ? v.trim() : null)
    addPromoCode(eventId, {
      code, type, value: type === 'percentage' ? Math.min(100, value) : value, used: 0,
      maxUsage: max > 0 ? max : null, start: date(r[iStart]), end: date(r[iEnd]), active: true,
    })
    taken.add(code)
    added++
  }
  if (!added) throw new Error(skipped ? 'all-skipped' : 'empty')
  return { added, skipped }
}

export { CODE_RE }
