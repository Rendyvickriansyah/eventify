import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Infinity as InfinityIcon, Pencil, Power, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { Table } from '@/components/data/Table'
import { Pagination } from '@/components/data/Pagination'
import { TicketIllustration } from '@/components/data/TicketIllustration'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu } from '@/components/ui/Menu'
import { toast } from '@/components/ui/Toast'
import { ConfirmDeletePromo } from '@/components/data/ConfirmDeletePromo'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import {
  usePromoCodes, ensureDemoPromoCodes, updatePromoCode, addPromoCode, takeJustCreatedPromo, importPromoCodes,
  typeLabel, formatValue, formatUsage, formatValidity, promoStatus, validityOf, usageOf,
} from '@/data/promoStore'
import moreIcon from '@/assets/icons/more-horizontal.svg'

/*
 * Discount & Promo Code — Figma empty state (267:32502) and table (268:33680).
 * Route: #/event/:id/promo. Filter & CTA bar (Discount Type · Status · Validity · Usage Range |
 * Upload CSV · Add Coupon Code), then the empty state or a 6-column table with a ⋯ menu and
 * pagination inside its frame. A row opens its Promo Code Details (#/event/:id/promo/:codeId).
 */

const filterDefs = [
  { id: 'type', label: 'Discount Type', options: [{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed Amount' }], test: (p, v) => p.type === v },
  { id: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'expired', label: 'Expired' }, { value: 'disabled', label: 'Disabled' }], test: (p, v) => promoStatus(p).key === v },
  { id: 'validity', label: 'Validity', options: [{ value: 'ongoing', label: 'Ongoing' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'ended', label: 'Ended' }, { value: 'all-time', label: 'All Time' }], test: (p, v) => validityOf(p) === v },
  { id: 'usage', label: 'Usage Range', options: [{ value: 'unused', label: 'Not used yet' }, { value: 'some', label: 'Under 50% used' }, { value: 'most', label: '50% or more used' }, { value: 'full', label: 'Fully used' }], test: (p, v) => usageOf(p) === v },
]
const noFilters = { type: null, status: null, validity: null, usage: null }
const enter = (index) => ({ '--enter-index': index })

/** @param {{ eventId: string }} props */
export function PromoCodes({ eventId }) {
  const event = useMemo(() => getEventDetail(eventId), [eventId])
  useState(() => ensureDemoPromoCodes(eventId)) // before the first read
  const codes = usePromoCodes(eventId)
  const [newId] = useState(takeJustCreatedPromo)
  const [filters, setFilters] = useState(noFilters)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)
  const fileRef = useRef(null)
  const base = `#/event/${eventId}/promo`

  // Newest first
  const sorted = useMemo(() => [...codes].reverse(), [codes])
  const filtered = useMemo(() => sorted.filter((p) => filterDefs.every((f) => !filters[f.id] || f.test(p, filters[f.id]))), [sorted, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)
  useEffect(() => { setPage(1) }, [filters, pageSize])

  if (!event) return null

  async function upload(file) {
    if (!file) return
    try {
      const { added, skipped } = importPromoCodes(eventId, await file.text(), codes)
      toast.success('Promo codes imported', { description: `${added} added from “${file.name}”${skipped ? ` · ${skipped} skipped (duplicate or invalid)` : ''}.` })
    } catch (err) {
      toast.error('Couldn’t import that file', {
        description: {
          'no-code': 'Add a header row with a “Code” column (Type, Value, Max Usage, Start, End are optional).',
          'all-skipped': 'Every row was a duplicate code or missing a value above 0.',
        }[err.message] ?? 'The CSV has no promo code rows. Use a header row, then one code per line.',
      })
    }
  }

  function toggle(p) {
    try {
      updatePromoCode(eventId, p.id, { active: !p.active })
      toast.success(p.active ? 'Promo code disabled' : 'Promo code enabled', { description: p.active ? `${p.code} can no longer be used at checkout.` : `Buyers can use ${p.code} at checkout again.` })
    } catch {
      toast.error('Couldn’t update the code', { description: 'Browser storage is unavailable.' })
    }
  }

  function duplicate(p) {
    const taken = new Set(codes.map((c) => c.code))
    let code = `${p.code}-COPY`.slice(0, 20)
    for (let n = 2; taken.has(code); n++) code = `${p.code}-${n}`.slice(0, 20)
    const { id: _i, demo: _d, createdAt: _c, used: _u, sold: _s, ...rest } = p
    try {
      addPromoCode(eventId, { ...rest, code, used: 0 })
      toast.success('Promo code duplicated', { description: `${code} is ready — same discount, no uses yet.` })
    } catch {
      toast.error('Couldn’t duplicate the code', { description: 'Browser storage is unavailable.' })
    }
  }

  const columns = [
    { key: 'code', header: 'Promo Code', render: (p) => <span className="font-medium">{p.code}</span> },
    { key: 'type', header: 'Discount Type', render: (p) => typeLabel[p.type] },
    { key: 'value', header: 'Value', render: (p) => formatValue(p) },
    {
      key: 'usage',
      header: 'Usage',
      // Unlimited as an icon — the app font has no proper ∞ glyph
      render: (p) => (p.maxUsage == null
        ? <span className="inline-flex items-center gap-1">{p.used.toLocaleString('en-US')} / <InfinityIcon role="img" aria-label="unlimited" className="size-4" strokeWidth={1.75} /></span>
        : formatUsage(p)),
    },
    { key: 'validity', header: 'Validity', render: (p) => formatValidity(p) },
    { key: 'status', header: 'Status', render: (p) => { const s = promoStatus(p); return <Badge tone={s.tone} key={s.key} className="badge-swap">{s.label}</Badge> } },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      className: 'w-16 py-0',
      render: (p) => (
        // The menu sits on the row link — keep its clicks/keys from opening the details
        <span className="relative z-1 inline-flex" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Menu
            icon={moreIcon}
            label={`More actions for ${p.code}`}
            items={[
              { id: 'edit', icon: Pencil, label: 'Edit', onSelect: () => { window.location.hash = `${base}/${p.id}/edit` } },
              { id: 'duplicate', icon: Copy, label: 'Duplicate', onSelect: () => duplicate(p) },
              { id: 'toggle', icon: Power, label: p.active ? 'Disable' : 'Enable', onSelect: () => toggle(p) },
              { id: 'sep', type: 'separator' },
              { id: 'delete', icon: Trash2, label: 'Delete', tone: 'danger', onSelect: () => setDeleting(p) },
            ]}
            className="-mr-1"
          />
        </span>
      ),
    },
  ]

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="promo"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="promo" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
      toolbar={
        // Figma "Filter & CTA": 20 / 32px sides, 12px vertical
        <div role="toolbar" aria-label="Filters and actions" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-default py-3 pr-4 pl-4 md:pr-8 md:pl-5">
          <div className="flex flex-wrap items-start gap-2">
            {filterDefs.map((f) => (
              <Dropdown key={f.id} label={f.label} align="start" options={f.options} value={filters[f.id]} onChange={(v) => setFilters((s) => ({ ...s, [f.id]: v }))} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fileRef.current?.click()} className="h-9 rounded-lg px-3 text-label text-shadow-button">Upload CSV</Button>
            <Button as="a" href={`${base}/new`} variant="glass" className="h-9">Add Coupon Code</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; upload(f) }} />
          </div>
        </div>
      }
    >
      <h1 className="sr-only">Discount & Promo Code — {event.title}</h1>

      {codes.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4 py-12">
          <EmptyState
            illustration={<TicketIllustration />}
            title="No Promo Codes Yet"
            description="Create a promo code to offer discounts and drive more ticket sales for your event."
            actions={
              <>
                <Button as="a" href={`${base}/new`} variant="glass" className="h-11 text-label">Create Promo Code</Button>
                <Button onClick={() => fileRef.current?.click()} className="h-11 rounded-lg px-3 text-label">Import Promo Code</Button>
              </>
            }
          />
        </div>
      ) : (
        <div className="enter-rise py-4 pr-4 pl-4 md:pr-8 md:pl-5" style={enter(0)}>
          <Table
            caption={`Promo codes for ${event.title}`}
            columns={columns}
            data={rows}
            rowKey={(p) => p.id}
            onRowClick={(p) => { window.location.hash = `${base}/${p.id}` }}
            rowLabel={(p) => `${p.code}, ${formatValue(p)} off, ${promoStatus(p).label} — open details`}
            rowClassName={(p) => (p.id === newId ? 'row-new' : undefined)}
            emptyState={
              <span className="inline-flex flex-col items-center gap-2">
                No promo codes match these filters.
                <button type="button" onClick={() => setFilters(noFilters)} className="cursor-pointer rounded-sm font-medium text-fg underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30">
                  Clear filters
                </button>
              </span>
            }
            className="rounded-b-none"
          />
          <Pagination page={current} pageCount={pageCount} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} className="rounded-b-lg border border-t-0 border-default bg-surface" />
        </div>
      )}

      <ConfirmDeletePromo eventId={eventId} promo={deleting} onClose={() => setDeleting(null)} />
    </DashboardLayout>
  )
}

export default PromoCodes
