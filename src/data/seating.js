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
