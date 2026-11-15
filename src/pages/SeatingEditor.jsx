import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TextInput } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { SeatCanvas } from '@/components/seating/SeatCanvas'
import { SelectionPanel } from '@/components/seating/SelectionPanel'
import { Panel, SideField, ColorField } from '@/components/seating/PanelParts'
import { useScene } from '@/components/seating/useScene'
import { LayersPanel } from '@/components/seating/LayersPanel'
import { ShapePicker } from '@/components/seating/ShapePicker'
import { leafIds } from '@/components/seating/layers'
import { Tabs } from '@/components/ui/Tabs'
import { usePersistentState } from '@/hooks/usePersistentState'
import { isAssignable } from '@/components/seating/geometry'
import { getEventDetail } from '@/data/eventDetail'
import { useTickets } from '@/data/ticketStore'
import { getSeatingChart, openSeatingChart, updateSeatingChart, tierColors, defaultCanvas } from '@/data/seating'
import plusIcon from '@/assets/icons/seating-editor/plus.svg'
import undoIcon from '@/assets/icons/seating-editor/undo.svg'
import redoIcon from '@/assets/icons/seating-editor/redo.svg'
import gripIcon from '@/assets/icons/seating-editor/grip.svg'
import penIcon from '@/assets/icons/seating-editor/pen-tool.svg'
import cursorIcon from '@/assets/icons/seating-editor/cursor.svg'
import shapeIcon from '@/assets/icons/seating-editor/shape.svg'
import textIcon from '@/assets/icons/seating-editor/text.svg'
import sectionIcon from '@/assets/icons/seating-editor/section.svg'
import imageIcon from '@/assets/icons/seating-editor/image.svg'

/*
 * Seating editor — Figma "Set Section (Empty States)" (159:11381) and "Set Section
 * (Not Assigned)" (149:10851). Route: #/event/:id/seating/:chartId.
 *
 *  ┌ 72px header: venue name + Draft badge · undo/redo · Publish & Preview ┐
 *  │ 300px tiers │ canvas (SeatCanvas) │ 300px tools + settings / selection │
 *
 * Draw with the tools on the right (a venue plan can be dropped in as a guide to trace).
 * To sell seats: click a ticket tier on the left — it arms, and a chip with its colour
 * follows the pointer — then click sections or drag across several. The right sidebar
 * switches to the Section / Seating form; "Assign Ticket" paints them in the tier colour
 * and counts their seats against the tier. Esc (or clicking the tier again) disarms.
 *
 * Everything — drawing, tier order, canvas settings, venue edits — saves to the chart as you go.
 */

const tools = [
  { id: 'pen', label: 'Pen', key: 'P', icon: penIcon },
  { id: 'select', label: 'Select', key: 'V', icon: cursorIcon },
  { id: 'shape', label: 'Shape', key: 'R', icon: shapeIcon },
  { id: 'text', label: 'Text', key: 'T', icon: textIcon },
  { id: 'section', label: 'Seat section', key: 'S', icon: sectionIcon },
  { id: 'image', label: 'Guide image', key: 'I', icon: imageIcon },
]
const digits = (v) => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
const count = (n) => n.toLocaleString('en-US')
const isTyping = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]')

/** @param {{ eventId: string, chartId: string }} props */
export function SeatingEditor({ eventId, chartId }) {
  const event = getEventDetail(eventId)
  const listHref = `#/event/${eventId}/seating`
  const [chart, setChart] = useState(() => openSeatingChart(eventId, chartId))
  const storedTickets = useTickets(eventId)
  const [tool, setToolState] = useState('select')
  const [shapeKind, setShapeKind] = useState('rect')
  const [selection, setSelection] = useState([])
  const [armedId, setArmedId] = useState(null)
  const [pulse, setPulse] = useState(null) // { id, at } — tier row flashes after an assign
  const [announce, setAnnounce] = useState('')
  const [leftTab, setLeftTab] = usePersistentState('eventify:seating-left-tab', 'tickets')
  const [layerHover, setLayerHover] = useState([])
  const [publishing, setPublishing] = useState(false)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const saveFailed = useRef(false)

  /** Applies a patch locally and persists it (storage errors warn once — the edit stays on screen). */
  const save = useCallback((patch) => {
    setChart((c) => (c ? { ...c, ...patch } : c))
    try {
      updateSeatingChart(eventId, chartId, patch)
      saveFailed.current = false
    } catch {
      if (!saveFailed.current) toast.error('Changes not saved', { description: 'Browser storage is full — try a smaller guide image, or remove one.' })
      saveFailed.current = true
    }
  }, [eventId, chartId])

  const scene = useScene(chart?.objects ?? [], (objects) => save({ objects }))
  const { objects } = scene

  // Unknown chart (deleted, or a link from another browser) → back to the list.
  useEffect(() => {
    if (!chart) {
      window.location.replace(listHref)
      toast.error('Seating chart not found', { description: 'It may have been deleted. Pick one from the list or create a new one.' })
    }
  }, [chart, listHref])

  const setTool = useCallback((id) => {
    setToolState(id)
    if (id !== 'select') setArmedId(null) // drawing and assigning don't mix
  }, [])

  const pickImage = () => fileRef.current?.click()
  const disarm = useCallback(() => setArmedId(null), [])

  // Tool shortcuts — ignored while typing or with a modifier (the canvas owns ⌘ shortcuts).
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || e.target.closest?.('dialog')) return
      const key = e.key.toLowerCase()
      if (key === 'o') { setShapeKind('ellipse'); return setTool('shape') }
      if (key === 'r') { setShapeKind('rect'); return setTool('shape') }
      if (key === 'i') { e.preventDefault(); return pickImage() }
      const match = tools.find((t) => t.key.toLowerCase() === key)
      if (match) setTool(match.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool])

  // A chart can bring its own tiers (the Figma sample); otherwise they're the event's ticket types.
  const chartTiers = chart?.tiers
  const ticketTiers = useMemo(() => {
    if (!event) return []
    const list = [
      ...(chartTiers ?? (event.demo ? event.ticketTypes.map((t) => ({ id: `demo-${t.id}`, name: t.name, seats: t.capacity })) : [])),
      ...storedTickets.map((t) => ({ id: t.id, name: t.name, seats: t.quantity })),
    ]
    const colors = tierColors(list.map((t) => t.name))
    return list.map((t, i) => ({ ...t, color: t.color ?? colors[i] }))
  }, [event, storedTickets, chartTiers])

  if (!event || !chart) return null

  const assignedBy = {}
  for (const o of objects) if (o.tierId) assignedBy[o.tierId] = (assignedBy[o.tierId] ?? 0) + (o.seats ?? 0)
  const order = chart.tierOrder ?? []
  const rank = (id) => (order.includes(id) ? order.indexOf(id) : order.length + ticketTiers.findIndex((t) => t.id === id))
  const tiers = ticketTiers.map((t) => ({ ...t, assigned: assignedBy[t.id] ?? 0 })).sort((a, b) => rank(a.id) - rank(b.id))
  const tierById = Object.fromEntries(tiers.map((t) => [t.id, t]))
  const armedTier = armedId ? tierById[armedId] ?? null : null

  // Panels edit the shapes themselves — a selected group stands for everything inside it.
  const selectedLeafIds = leafIds(objects, selection)
  const selected = objects.filter((o) => selectedLeafIds.has(o.id))
  const canvas = { ...defaultCanvas, ...chart.canvas }
  const assigned = Object.values(assignedBy).reduce((a, b) => a + b, 0)
  const lockedGuides = objects.filter((o) => o.type === 'image' && o.locked)
  const published = chart.status === 'published'

  function arm(id) {
    const next = armedId === id ? null : id
    setArmedId(next)
    setToolState('select')
    setLeftTab('tickets')
    // Labels and guide images can't take a tier — drop them from the selection.
    if (next) setSelection((ids) => ids.filter((sid) => isAssignable(objects.find((o) => o.id === sid) ?? {})))
    setAnnounce(next ? `${tierById[id].name} selected. Click sections on the canvas, or drag to select several.` : 'Assigning stopped.')
  }

  function onAssigned(tierId, sections) {
    setPulse({ id: tierId, at: Date.now() })
    setAnnounce(`${sections} ${sections === 1 ? 'section' : 'sections'} assigned to ${tierById[tierId]?.name}.`)
  }

  async function publish() {
    if (publishing) return
    if (!assigned) {
      toast.error('Nothing to sell yet', { description: 'Assign at least one section to a ticket tier before publishing.' })
      return
    }
    setPublishing(true)
    await new Promise((r) => setTimeout(r, 600)) // no API yet
    save({ status: 'published', objects })
    setPublishing(false)
    toast.success('Seating Chart Published', { description: `“${chart.name}” is live with ${count(assigned)} assigned seats.` })
  }

  return (
    <div className="flex h-dvh flex-col bg-surface">
      {/* Header — 72px, 24px sides */}
      <header className="flex h-18 shrink-0 items-center justify-between gap-4 border-b border-default px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <a
            href={listHref}
            aria-label="Back to seating charts"
            className="press -ml-2 flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted outline-none transition-[background-color,color] duration-150 ease-out hover:bg-surface-muted hover:text-fg focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </a>
          <h1 className="truncate text-body-lg font-medium text-fg">{chart.name || 'Untitled venue'}</h1>
          <Badge tone={published ? 'success' : 'neutral'} className="shrink-0">{published ? 'Published' : 'Draft'}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <div className="flex items-center gap-4">
            <HistoryButton icon={undoIcon} label="Undo" shortcut="⌘Z" disabled={!scene.canUndo} onClick={scene.undo} />
            <HistoryButton icon={redoIcon} label="Redo" shortcut="⇧⌘Z" disabled={!scene.canRedo} onClick={scene.redo} />
          </div>
          <Button variant="glass" onClick={publish} loading={publishing}>
            {publishing ? 'Publishing…' : 'Publish & Preview'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left sidebar — Tickets (Figma "Sidebar / Draw Venue") and Layers tabs */}
        <aside aria-label="Tickets and layers" className="flex shrink-0 flex-col border-default bg-surface lg:w-75 lg:overflow-hidden lg:border-r">
          <div className="shrink-0 border-b border-default px-6">
            <Tabs
              idPrefix="seat-left"
              label="Sidebar"
              variant="inline"
              className="h-auto gap-6"
              value={leftTab}
              onChange={setLeftTab}
              tabs={[{ id: 'tickets', label: 'Tickets' }, { id: 'layers', label: 'Layers' }]}
            />
          </div>
          {leftTab === 'layers' ? (
            <div role="tabpanel" id="seat-left-panel-layers" aria-labelledby="seat-left-tab-layers" className="tab-panel-in min-h-0 flex-1 overflow-y-auto">
              <LayersPanel objects={objects} selection={selection} setSelection={setSelection} scene={scene} onHover={setLayerHover} />
            </div>
          ) : (
          <div role="tabpanel" id="seat-left-panel-tickets" aria-labelledby="seat-left-tab-tickets" className="tab-panel-in min-h-0 flex-1 overflow-y-auto">
          {tiers.length ? (
            <TierList tiers={tiers} armedId={armedId} pulse={pulse} onArm={arm} onReorder={(ids) => save({ tierOrder: ids })} />
          ) : (
            <div className="flex flex-col gap-1 px-6 pt-6 pb-2">
              <p className="text-label text-fg">No ticket tiers yet</p>
              <p className="text-body text-pretty text-fg-muted">Seats are sold per ticket type. Add one to start assigning sections.</p>
            </div>
          )}
          <div className="px-6 py-4">
            <Button as="a" href={`#/event/${eventId}/tickets/new`} variant="secondary" className="h-10 w-full gap-1 rounded-lg text-label text-shadow-button">
              <Icon src={plusIcon} />
              Add New Tier
            </Button>
          </div>
          {armedTier && (
            <p className="tier-hint mx-6 mb-4 rounded-md bg-surface-muted px-3 py-2 text-caption text-pretty text-fg-muted">
              Click a section to assign <span className="font-medium text-fg">{armedTier.name}</span>, or drag to select several. <kbd className="font-sans font-medium text-fg">Esc</kbd> to stop.
            </p>
          )}
          </div>
          )}
        </aside>

        <SeatCanvas
          ref={canvasRef}
          objects={objects}
          scene={scene}
          tool={tool}
          setTool={setTool}
          shapeKind={shapeKind}
          selection={selection}
          setSelection={setSelection}
          tierById={tierById}
          armedTier={armedTier}
          onDisarm={disarm}
          background={canvas.background}
          highlight={layerHover}
        />

        {/* Tools & settings — Figma "Right Sidebar" */}
        <aside aria-label="Canvas settings" className="seat-panel flex shrink-0 flex-col bg-surface lg:w-75 lg:overflow-y-auto lg:border-l lg:border-default">
          <input
            ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) canvasRef.current?.addImage(file) }}
          />
          {/* Selecting an object swaps the tools for its Rotation / Appearance controls (Figma design panel) */}
          {!selected.length && (
          <Panel title="Tools" className="border-b border-default">
            <div role="toolbar" aria-label="Drawing tools" className="flex items-start justify-between gap-2">
              {tools.map((t) => (t.id === 'shape' ? (
                <ShapePicker key="shape" kind={shapeKind} active={tool === 'shape'} onPick={(kind) => { setShapeKind(kind); setTool('shape') }} />
              ) : (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === 'image' ? undefined : tool === t.id}
                  aria-label={t.label}
                  aria-keyshortcuts={t.key}
                  title={`${t.label} (${t.id === 'shape' ? 'R / O' : t.key})`}
                  onClick={() => (t.id === 'image' ? pickImage() : setTool(t.id))}
                  className={cn(
                    'seat-tool flex size-9 cursor-pointer items-center justify-center rounded-md border outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
                    tool === t.id ? 'border-black/15 bg-surface shadow-xs dark:border-default' : 'border-transparent bg-neutral-100 dark:bg-surface-muted',
                  )}
                >
                  <Icon src={t.icon} />
                </button>
              )))}
            </div>
          </Panel>
          )}

          {selected.length ? (
            <SelectionPanel
              objects={objects}
              selected={selected}
              scene={scene}
              tiers={tiers}
              armedTier={armedTier}
              onAssigned={onAssigned}
              canvasBackground={canvas.background}
            />
          ) : (
            <>
              <Panel title="Canvas" className="border-b border-default">
                <div className="flex flex-col gap-4">
                  <ColorField label="Background" value={canvas.background} onChange={(background) => save({ canvas: { ...canvas, background } })} />
                  {lockedGuides.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2">
                      <span className="text-caption text-fg-muted">{lockedGuides.length === 1 ? 'Guide image locked' : `${lockedGuides.length} guide images locked`}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = new Set(lockedGuides.map((o) => o.id))
                          scene.apply((list) => list.map((o) => (ids.has(o.id) ? { ...o, locked: false } : o)))
                          setSelection([...ids])
                        }}
                        className="cursor-pointer rounded-sm text-caption font-medium text-fg underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Venue details stay out of the way while a drawing tool is active */}
              {tool === 'select' && (
              <Panel title="Venue" className="border-b border-default">
                <div className="flex flex-col gap-4">
                  <SideField label="Venue Name">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={chart.name}
                        maxLength={80}
                        autoComplete="off"
                        onChange={(e) => setChart((c) => ({ ...c, name: e.target.value }))}
                        onBlur={(e) => {
                          const name = e.target.value.trim()
                          if (name) save({ name })
                          else setChart((c) => ({ ...c, name: getSeatingChart(eventId, chartId)?.name ?? '' })) // a venue needs a name
                        }}
                      />
                    )}
                  </SideField>
                  <SideField label="Total Capacity" error={Number(chart.capacity) && assigned > Number(chart.capacity) ? `Assigned seats (${count(assigned)}) exceed the capacity.` : undefined}>
                    {(id, describedBy) => (
                      <TextInput
                        id={id}
                        aria-describedby={describedBy}
                        value={String(chart.capacity ?? '')}
                        inputMode="numeric"
                        maxLength={7}
                        autoComplete="off"
                        className="tabular-nums"
                        onChange={(e) => {
                          const v = digits(e.target.value)
                          if (v === '') setChart((c) => ({ ...c, capacity: '' }))
                          else save({ capacity: Number(v) })
                        }}
                        onBlur={() => { if (chart.capacity === '') setChart((c) => ({ ...c, capacity: getSeatingChart(eventId, chartId)?.capacity ?? 0 })) }}
                      />
                    )}
                  </SideField>
                  <SideField label="Assigned">
                    {(id) => <TextInput id={id} readOnly value={count(assigned)} className="tabular-nums" />}
                  </SideField>
                  <SideField label="Remaining">
                    {(id) => <TextInput id={id} readOnly value={count(Math.max(0, Number(chart.capacity || 0) - assigned))} className="tabular-nums" />}
                  </SideField>
                </div>
              </Panel>
              )}
            </>
          )}
        </aside>
      </div>
      <p role="status" className="sr-only">{announce}</p>
    </div>
  )
}

/** Figma 24px undo/redo at 70%. */
function HistoryButton({ icon, label, shortcut, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={label === 'Undo' ? 'Control+Z Meta+Z' : 'Control+Shift+Z Meta+Shift+Z'}
      title={`${label} (${shortcut})`}
      className="press flex size-6 cursor-pointer items-center justify-center rounded-sm opacity-70 outline-none transition-opacity duration-150 hover:opacity-100 focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-default disabled:opacity-30"
    >
      <img src={icon} alt="" width="24" height="24" draggable={false} className="dark:invert" />
    </button>
  )
}

/**
 * Figma tier rows: 24 × 16 padding, 16px gap — grip, 40px colour swatch, 12/16 name +
 * "250 Assigned / 500 Seats" at 60%. Click a row to arm it for assigning (again to stop);
 * drag the grip (or Alt+↑/↓ on it) to reorder.
 */
function TierList({ tiers, armedId, pulse, onArm, onReorder }) {
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [announce, setAnnounce] = useState('')
  const grips = useRef({})
  const ids = tiers.map((t) => t.id)

  function move(id, toIndex) {
    const from = ids.indexOf(id)
    if (from === -1 || toIndex < 0 || toIndex >= ids.length || toIndex === from) return false
    const next = [...ids]
    next.splice(from, 1)
    next.splice(toIndex, 0, id)
    onReorder(next)
    setAnnounce(`${tiers[from].name} moved to position ${toIndex + 1} of ${ids.length}`)
    return true
  }

  return (
    <>
      <ul className="flex flex-col">
        {tiers.map((t, i) => {
          const armed = armedId === t.id
          const full = t.assigned >= t.seats
          return (
            <li
              key={t.id}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(t.id) } }}
              onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, i); setDragId(null); setOverId(null) }}
              data-dragging={dragId === t.id || undefined}
              // The dragged row lands at this index: below the target when moving down, above when moving up
              data-over={overId === t.id && dragId !== t.id ? (ids.indexOf(dragId) < i ? 'after' : 'before') : undefined}
              data-armed={armed || undefined}
              style={{ '--tier': t.color }}
              className="tier-row flex items-center gap-4 px-6 py-4"
            >
              <button
                ref={(el) => { grips.current[t.id] = el }}
                type="button"
                draggable
                onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.name); e.dataTransfer.setDragImage(e.currentTarget.closest('li'), 24, 36) }}
                onDragEnd={() => { setDragId(null); setOverId(null) }}
                onKeyDown={(e) => {
                  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
                  e.preventDefault()
                  if (move(t.id, i + (e.key === 'ArrowUp' ? -1 : 1))) requestAnimationFrame(() => grips.current[t.id]?.focus())
                }}
                aria-label={`Reorder ${t.name}`}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                title="Drag to reorder (Alt+↑/↓)"
                className="relative z-1 -m-2 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md outline-none hover:bg-black/5 focus-visible:ring-4 focus-visible:ring-primary/20 active:cursor-grabbing"
              >
                {/* Figma "Grip": 6.67 × 12 vector in a 16px box */}
                <img src={gripIcon} alt="" width="6.667" height="12" draggable={false} className="opacity-50 dark:invert" />
              </button>
              <button
                type="button"
                aria-pressed={armed}
                aria-label={`${armed ? 'Stop assigning' : 'Assign'} ${t.name} — ${count(t.assigned)} of ${count(t.seats)} seats assigned`}
                onClick={() => onArm(t.id)}
                className="tier-pick flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left outline-none before:absolute before:inset-0 before:content-[''] focus-visible:before:ring-4 focus-visible:before:ring-primary/20 focus-visible:before:ring-inset"
              >
                <span aria-hidden className="tier-swatch relative size-10 shrink-0 rounded-full" style={{ backgroundColor: t.color }}>
                  <span className="tier-ring absolute inset-0 rounded-full" />
                  {pulse?.id === t.id && <span key={pulse.at} className="tier-pulse absolute inset-0 rounded-full" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-caption">
                  <span className="tier-name truncate font-medium text-fg">{t.name}</span>
                  <span className="text-fg opacity-60 tabular-nums">
                    <span key={t.assigned} className="tick-in inline-block">{count(t.assigned)}</span> Assigned / {count(t.seats)} Seats
                    {full && <span className="sr-only"> (full)</span>}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p role="status" className="sr-only">{announce}</p>
    </>
  )
}

export default SeatingEditor
