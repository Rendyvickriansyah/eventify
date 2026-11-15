import { createEventCollection } from '@/lib/localStore'
import { arenaStadiumSeed } from '@/data/arenaStadiumSample'
import { indoorArenaSeed } from '@/data/indoorArenaSample'
import arenaStadium from '@/assets/seating/jakarta-arena-stadium.svg'
import indoorArena from '@/assets/seating/jakarta-indoor-arena.png'

const MINUTE = 60_000

/**
 * Seating charts saved for an event — Figma "Seating Chart" (node 191:11987).
 * Mock: every event starts with the two venue layouts from the design.
 * `editedAt` is a timestamp so "Edited … ago" stays truthful as the page sits open.
 */
export function seatingChartsFor() {
  const now = Date.now()
  return [
    { id: 'arena-stadium', name: 'Jakarta Arena Stadium', image: arenaStadium, editedAt: now - 3 * MINUTE },
    { id: 'indoor-arena', name: 'Jakarta Indoor Arena', image: indoorArena, editedAt: now - 13 * MINUTE },
  ]
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "Edited just now" / "Edited 3 minutes ago" / "Edited 2 hours ago" / "Edited yesterday". */
export function formatEdited(editedAt, now = Date.now()) {
  const minutes = Math.round((now - editedAt) / MINUTE)
  if (minutes < 1) return 'Edited just now'
  if (minutes < 60) return `Edited ${relative.format(-minutes, 'minute')}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Edited ${relative.format(-hours, 'hour')}`
  return `Edited ${relative.format(-Math.round(hours / 24), 'day')}`
}

/*
 * Seating charts the organiser sets up (Figma "Create Seating Chart", node 147:10610),
 * persisted per event as { [eventId]: SeatingChart[] }. Listed before the sample layouts.
 *
 * @typedef {{ id: string, name: string, venueType: string, description: string,
 *   address: string, capacity: number, createdAt: string }} SavedSeatingChart
 */
const saved = createEventCollection('eventify:seating', 'seat')

export const getSavedSeatingCharts = saved.get
/** Saves a chart; throws when storage is full or unavailable. */
export const addSeatingChart = saved.add
export const removeSeatingChart = saved.remove
export const takeJustCreatedSeatingChart = saved.takeJustCreated

export const venueTypes = ['Stadium', 'Arena', 'Theater', 'Concert Hall', 'Convention Center', 'Ballroom', 'Outdoor Venue']
export const updateSeatingChart = saved.update

export const getSeatingChart = (eventId, chartId) => saved.get(eventId).find((c) => c.id === chartId) ?? null

/* Sample layouts that open in the editor with their drawing already in place. */
const sampleSeeds = {
  'arena-stadium': arenaStadiumSeed,
  'indoor-arena': indoorArenaSeed,
}
/** A fresh copy of a sample's data (without its id), or null. */
export const sampleSeed = (id) => {
  if (!sampleSeeds[id]) return null
  const { id: _id, ...seed } = sampleSeeds[id]()
  return seed
}
export const hasSampleLayout = (id) => id in sampleSeeds
/** The sample cards' preview images (kept out of storage — build URLs change). */
export const samplePreview = { 'arena-stadium': arenaStadium, 'indoor-arena': indoorArena }

/**
 * The saved chart, or — for a sample opened the first time — the sample saved under its own id
 * (so edits stick from then on). Null when neither exists.
 */
export function openSeatingChart(eventId, chartId) {
  const existing = getSeatingChart(eventId, chartId)
  // A sample saved from an older layout — empty (never drawn on), or the earlier dot-path seat
  // map — picks up the current layout
  const outdated = existing && sampleSeeds[chartId] && ((!existing.objects?.length && !existing.tierOrder) || existing.objects?.some((o) => o.dots))
  if (outdated) {
    const { objects, tiers, capacity, layoutVersion } = sampleSeeds[chartId]()
    // 12000 / 10000 were the earlier versions' capacities — take the layout's own
    const patch = { objects, tiers, layoutVersion, ...([12000, 10000].includes(existing.capacity) && { capacity }) }
    try { return updateSeatingChart(eventId, chartId, patch) } catch { return { ...existing, ...patch } }
  }
  if (existing || !sampleSeeds[chartId]) return existing
  const seed = sampleSeeds[chartId]()
  try {
    return addSeatingChart(eventId, seed)
  } catch {
    return { ...seed, createdAt: new Date().toISOString() } // storage full: editable for this visit
  }
}
/** One saved chart, or null when the id is unknown (deleted, or another browser's). */

/*
 * Tier swatches — Figma "Section Color" (40px circle). Names that say their colour get it
 * (Gold → amber, Silver → gray…); the rest take the next unused colour.
 * Hex (the colors.css token values) because they also fill SVG shapes on the canvas.
 */
const tierPalette = ['#2B7FFF', '#FFB900', '#6A7282', '#00C950', '#FB2C36', '#8EC5FF', '#E17100', '#008236']
const namedColors = [
  [/vvip|vip|court/i, '#2B7FFF'],
  [/gold|ring/i, '#FFB900'],
  [/silver|platinum|grand/i, '#6A7282'],
  [/general|regular|festival|upper|economy/i, '#00C950'],
]
/** One colour per tier name, in order; no two tiers share a colour until the palette runs out. */
export function tierColors(names) {
  const used = new Set()
  return names.map((name, i) => {
    const named = namedColors.find(([re]) => re.test(name))?.[1]
    const color = named && !used.has(named) ? named : tierPalette.find((c) => !used.has(c)) ?? tierPalette[i % tierPalette.length]
    used.add(color)
    return color
  })
}

/** The canvas is vector (Figma-style): no layout grid — a pixel grid fades in when zoomed in close. */
export const defaultCanvas = { background: '#F0F0F0' }

export const seatingTypes = ['General Seating', 'Reserved Seating', 'Standing', 'Table Seating']
