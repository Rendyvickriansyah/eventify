import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { Button } from '@/components/ui/Button'
import { SeatingChartCard } from '@/components/data/SeatingChartCard'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import { seatingChartsFor, getSavedSeatingCharts, addSeatingChart, removeSeatingChart, takeJustCreatedSeatingChart, hasSampleLayout, samplePreview, sampleSeed } from '@/data/seating'

/** First-paint stagger (see `.enter-rise`); later additions enter on their own. */
const enter = (index) => ({ '--enter-index': index })

/** Saved charts (newest first) ahead of the sample layouts; the one just created pops in. */
function initialCharts(eventId) {
  const justCreated = takeJustCreatedSeatingChart()
  const saved = [...getSavedSeatingCharts(eventId)].reverse().map((c) => ({
    ...c, saved: true, image: samplePreview[c.id], editedAt: Date.parse(c.updatedAt ?? c.createdAt), added: c.id === justCreated,
  }))
  // A sample that has been opened (and so saved) shows once, as the saved chart
  const savedIds = new Set(saved.map((c) => c.id))
  return [...saved, ...seatingChartsFor().filter((c) => !savedIds.has(c.id))]
}

/**
 * Seating Chart — Figma "Seating Chart" (node 191:11987). Route: #/event/:id/seating.
 * CTA bar (32 × 16 padding, bottom border) with "Create Seating Chart", then a grid of
 * 344px chart cards (32px padding, 24px gap).
 *
 * @param {{ eventId: string }} props
 */
export function SeatingChart({ eventId }) {
  const event = getEventDetail(eventId)
  const [charts, setCharts] = useState(() => initialCharts(eventId))
  const [removingId, setRemovingId] = useState(null)
  const [undo, setUndo] = useState(null) // { chart, index }
  const [announcement, setAnnouncement] = useState('')
  const now = useNow(30_000)
  const undoRef = useRef(null)

  const finishRemoval = useCallback(() => {
    const chart = charts.find((c) => c.id === removingId)
    if (chart?.saved) {
      try { removeSeatingChart(eventId, chart.id) } catch { /* storage unavailable — list still updates */ }
    }
    setCharts((list) => list.filter((c) => c.id !== removingId))
    setRemovingId(null)
  }, [charts, removingId, eventId])

  // Move focus to Undo once the deleted card (and its focused menu trigger) is gone.
  useEffect(() => {
    if (undo && !removingId) undoRef.current?.focus()
  }, [undo, removingId])

  if (!event) return null // App only routes here for known events

  // `added` marks cards that mount after first paint: they pop in on their own instead of
  // joining the page stagger (and keep that class, so no animation ever replays).
  function insert(chart, index) {
    setCharts((list) => [...list.slice(0, index), { ...chart, added: true }, ...list.slice(index)])
  }

  function duplicate(chart) {
    let copy = { ...chart, id: `${chart.id}-copy-${Date.now()}`, name: `Copy of ${chart.name}`, editedAt: Date.now() }
    // Saved charts and samples copy as real charts (drawing included), so the copy opens too
    const { id: _id, saved: _saved, added: _added, editedAt: _editedAt, createdAt: _createdAt, updatedAt: _updatedAt, image: _image, ...rest } = chart
    const data = chart.saved ? rest : sampleSeed(chart.id)
    if (data) {
      try { copy = { ...copy, ...addSeatingChart(eventId, { ...data, name: copy.name }), saved: true } } catch { /* keep it in the list for this visit */ }
    }
    insert(copy, charts.indexOf(chart) + 1)
    setAnnouncement(`${copy.name} created`)
  }

  function remove(chart) {
    if (removingId) finishRemoval()
    setUndo({ chart, index: charts.indexOf(chart) })
    setRemovingId(chart.id)
    setAnnouncement(`${chart.name} deleted`)
  }

  function restore() {
    let chart = undo.chart
    if (chart.saved) {
      // Deleting removed it from storage — save it again (it gets a fresh id).
      const { id: _id, saved: _saved, added: _added, editedAt: _editedAt, ...rest } = chart
      try { chart = { ...chart, ...addSeatingChart(eventId, rest) } } catch { /* keep it in the list for this visit */ }
    }
    insert(chart, Math.min(undo.index, charts.length))
    setAnnouncement(`${undo.chart.name} restored`)
    setUndo(null)
  }

  // Clicking a card opens it in the editor; the ⋯ menu holds the rest.
  const editorHref = (chart) => (chart.saved || hasSampleLayout(chart.id) ? `#/event/${event.id}/seating/${chart.id}` : undefined)
  const menuItems = (chart) => [
    { id: 'duplicate', icon: Copy, label: 'Duplicate', onSelect: () => duplicate(chart) },
    { id: 'sep', type: 'separator' },
    { id: 'delete', icon: Trash2, label: 'Delete', tone: 'danger', onSelect: () => remove(chart) },
  ]

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="seating"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="seating" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
    >
      <h1 className="sr-only">Seating Chart</h1>

      {/* CTA — 32px sides, 16px vertical, bottom divider */}
      <div className="enter-rise flex items-center justify-end gap-4 border-b border-default px-4 py-4 md:px-8" style={enter(0)}>
        <p className="status-fade mr-auto flex items-center gap-2 text-body text-fg-muted" data-visible={undo ? true : undefined} inert={!undo || undefined}>
          {undo && (
            <>
              <span className="truncate">“{undo.chart.name}” deleted.</span>
              <button ref={undoRef} type="button" onClick={restore} className="press cursor-pointer rounded-sm font-medium text-fg underline-offset-4 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-primary/20">
                Undo
              </button>
            </>
          )}
        </p>
        <Button as="a" href={`#/event/${event.id}/seating/new`} variant="glass" className="h-11 shrink-0 text-body font-medium">
          Create Seating Chart
        </Button>
      </div>
      <p role="status" className="sr-only">{announcement}</p>

      {charts.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,344px),344px))] gap-6 px-4 py-8 md:px-8">
          {charts.map((chart, i) => (
            <SeatingChartCard
              key={chart.id}
              chart={chart}
              now={now}
              href={editorHref(chart)}
              menuItems={menuItems(chart)}
              removing={chart.id === removingId}
              onExited={finishRemoval}
              className={chart.added ? 'seat-card-in' : 'enter-rise'}
              style={enter(i + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="enter-rise flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="text-label text-fg">No seating charts yet</p>
          <p className="text-body text-fg-muted">Create one to map sections and assign ticket types to seats.</p>
        </div>
      )}
    </DashboardLayout>
  )
}

/** Re-renders every `interval` ms so relative "Edited … ago" labels stay current. */
function useNow(interval) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

export default SeatingChart
