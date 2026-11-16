import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { Table } from '@/components/data/Table'
import { Pagination } from '@/components/data/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import { useAttendees, setCheckIn, refundAttendee, importAttendees, attendeesCsv, formatCheckIn } from '@/data/attendees'
import checkSuccess from '@/assets/icons/check-success.svg'

/*
 * Attendees — Figma "Attendees" (node 220:20956). Route: #/event/:id/attendees.
 * Filter & CTA bar (Check-in Status · Ticket Type · Payment Status | Upload CSV · Export CSV),
 * a 4-column table (name, ticket type, check-in badge, seat) with pagination inside its frame.
 * Clicking a row opens "Attendee Details" (node 306:31489) in a side sheet: profile, check-in,
 * ticket details, add-ons, Resend / Refund.
 */

const checkinOptions = [
  { value: 'in', label: 'Checked-in' },
  { value: 'out', label: 'Not checked-in' },
]
const paymentOptions = ['Paid', 'Pending', 'Refunded'].map((p) => ({ value: p, label: p }))
const count = (n) => n.toLocaleString('en-US')
const enter = (index) => ({ '--enter-index': index })

/** @param {{ eventId: string }} props */
export function Attendees({ eventId }) {
  const event = useMemo(() => getEventDetail(eventId), [eventId])
  const attendees = useAttendees(event)
  const [filters, setFilters] = useState({ checkin: null, ticket: null, payment: null })
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const fileRef = useRef(null)

  const filtered = useMemo(() => attendees.filter((a) => (
    (!filters.checkin || (filters.checkin === 'in') === Boolean(a.checkedInAt))
    && (!filters.ticket || a.ticketTypeId === filters.ticket)
    && (!filters.payment || a.payment === filters.payment)
  )), [attendees, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize)
  const open = attendees.find((a) => a.id === openId) ?? null

  // A new filter or page size starts from the first page
  useEffect(() => { setPage(1) }, [filters, pageSize])

  if (!event) return null // App only routes here for known events

  const ticketOptions = event.ticketTypes.map((t) => ({ value: t.id, label: t.name }))
  const filtering = Object.values(filters).some(Boolean)

  function exportCsv() {
    const blob = new Blob([attendeesCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attendees.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Attendee list exported', { description: `${count(filtered.length)} ${filtered.length === 1 ? 'attendee' : 'attendees'}${filtering ? ' matching your filters' : ''} saved as CSV.` })
  }

  async function uploadCsv(file) {
    if (!file) return
    try {
      const added = importAttendees(event, await file.text())
      toast.success('Guest list imported', { description: `${count(added)} ${added === 1 ? 'attendee' : 'attendees'} added from “${file.name}”.` })
    } catch (err) {
      toast.error('Couldn’t import that file', {
        description: err.message === 'no-name'
          ? 'Add a header row with a “Name” column (Email, Ticket Type and Seat are optional).'
          : 'The CSV has no attendee rows. Use a header row, then one attendee per line.',
      })
    }
  }

  const columns = [
    { key: 'name', header: 'Attendee Name' },
    { key: 'ticketType', header: 'Ticket Type' },
    { key: 'checkin', header: 'Check-in Status', render: (a) => <CheckinBadge attendee={a} /> },
    { key: 'seat', header: 'Seat' },
  ]

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="attendees"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="attendees" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
      toolbar={
        // Figma "Filter & CTA": filters left, CSV actions right — 20 / 32px sides, 12px vertical
        <div role="toolbar" aria-label="Filters and actions" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-default py-3 pr-4 pl-4 md:pr-8 md:pl-5">
          <div className="flex flex-wrap items-start gap-2">
            <Dropdown label="Check-in Status" align="start" options={checkinOptions} value={filters.checkin} onChange={(v) => setFilters((f) => ({ ...f, checkin: v }))} />
            <Dropdown label="Ticket Type" align="start" options={ticketOptions} value={filters.ticket} onChange={(v) => setFilters((f) => ({ ...f, ticket: v }))} />
            <Dropdown label="Payment Status" align="start" options={paymentOptions} value={filters.payment} onChange={(v) => setFilters((f) => ({ ...f, payment: v }))} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fileRef.current?.click()} className="h-9 rounded-lg px-3 text-label text-shadow-button">Upload CSV</Button>
            <Button variant="glass" onClick={exportCsv} disabled={!filtered.length} className="h-9">Export CSV</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadCsv(f) }} />
          </div>
        </div>
      }
    >
      <h1 className="sr-only">Attendees — {event.title}</h1>

      {attendees.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4 py-12">
          <EmptyState
            title="No attendees yet"
            description="People show up here as soon as they buy a ticket. Have a guest list already? Upload it as a CSV."
            actions={<Button onClick={() => fileRef.current?.click()} className="h-10 rounded-lg px-4">Upload CSV</Button>}
          />
        </div>
      ) : (
        <div className="enter-rise py-4 pr-4 pl-4 md:pr-8 md:pl-5" style={enter(0)}>
          <Table
            caption={`Attendees of ${event.title}`}
            columns={columns}
            data={rows}
            rowKey={(a) => a.id}
            onRowClick={(a) => setOpenId(a.id)}
            rowLabel={(a) => `${a.name}, ${a.ticketType}, ${a.checkedInAt ? 'checked in' : 'not checked in'} — open details`}
            activeRow={openId}
            emptyState={
              <span className="inline-flex flex-col items-center gap-2">
                No attendees match these filters.
                <button type="button" onClick={() => setFilters({ checkin: null, ticket: null, payment: null })} className="cursor-pointer rounded-sm font-medium text-fg underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30">
                  Clear filters
                </button>
              </span>
            }
            className="rounded-b-none"
          />
          {/* Figma: pagination sits inside the table's frame */}
          <Pagination
            page={current}
            pageCount={pageCount}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={setPageSize}
            className="rounded-b-lg border border-t-0 border-default bg-surface"
          />
        </div>
      )}

      <AttendeeSheet event={event} attendee={open} onClose={() => setOpenId(null)} />
    </DashboardLayout>
  )
}

/** Figma "Badges": green check "Checked-in", or neutral "Not checked-in". */
function CheckinBadge({ attendee }) {
  return attendee.checkedInAt ? (
    <Badge tone="success" key="in" className="badge-swap">
      <Icon src={checkSuccess} className="size-5 dark:invert-0" />
      Checked-in
    </Badge>
  ) : (
    <Badge tone="neutral" key="out" className="badge-swap">Not checked-in</Badge>
  )
}

/** "Attendee Details" — Figma Sheet (node 306:31489). */
function AttendeeSheet({ event, attendee, onClose }) {
  const [shown, setShown] = useState(attendee) // keep the content while the sheet slides out
  const [busy, setBusy] = useState(null) // 'resend' | 'refund'
  const [confirmRefund, setConfirmRefund] = useState(false)
  useEffect(() => { if (attendee) setShown(attendee) }, [attendee])
  const a = attendee ?? shown

  function toggleCheckIn() {
    const next = !a.checkedInAt
    try {
      setCheckIn(event.id, a.id, next)
      toast.success(next ? 'Checked in' : 'Check-in undone', { description: next ? `${a.name} is marked as arrived.` : `${a.name} is back to not checked-in.` })
    } catch {
      toast.error('Couldn’t save the check-in', { description: 'Browser storage is unavailable.' })
    }
  }

  async function resend() {
    setBusy('resend')
    await new Promise((r) => setTimeout(r, 700)) // no API yet
    setBusy(null)
    toast.success('Ticket resent', { description: a.email ? `We emailed the ticket to ${a.email}.` : `${a.name} has no email on file — the ticket is ready to download.` })
  }

  async function refund() {
    setBusy('refund')
    await new Promise((r) => setTimeout(r, 700))
    try {
      refundAttendee(event.id, a.id)
      toast.success('Ticket refunded', { description: `${a.name}’s order ${a.orderId} is refunded and the ticket no longer admits entry.` })
    } catch {
      toast.error('Couldn’t refund the ticket', { description: 'Browser storage is unavailable.' })
    }
    setBusy(null)
    setConfirmRefund(false)
  }

  const refunded = a?.payment === 'Refunded'
  const canCheckIn = a?.payment === 'Paid'

  return (
    <>
      <Sheet
        open={Boolean(attendee)}
        onClose={onClose}
        title="Attendee Details"
        footer={a && (
          <>
            <Button variant="glass" onClick={resend} loading={busy === 'resend'} disabled={refunded} className="h-11 w-full text-body-lg">
              {busy === 'resend' ? 'Sending…' : 'Resend Ticket'}
            </Button>
            <Button onClick={() => setConfirmRefund(true)} disabled={refunded || a.payment === 'Pending'} className="h-11 w-full rounded-lg text-body-lg font-medium text-shadow-button">
              {refunded ? 'Refunded' : 'Refund Ticket'}
            </Button>
          </>
        )}
      >
        {a && (
          <div key={a.id} className="sheet-content flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar attendee={a} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-body-lg font-medium text-fg">{a.name}</p>
                  <p className="truncate text-body-lg text-fg opacity-60">{a.email || 'No email on file'}</p>
                </div>
              </div>
              <Button onClick={toggleCheckIn} disabled={!canCheckIn} className="h-10 w-full rounded-lg text-label text-shadow-button">
                {a.checkedInAt ? 'Undo Check-in' : 'Mark as Checked-in'}
              </Button>
              {!canCheckIn && (
                <p className="text-caption text-fg-muted">{refunded ? 'Refunded tickets can’t be checked in.' : 'Check-in opens once the payment is complete.'}</p>
              )}
            </div>
            <hr className="border-0 border-t border-black/10 dark:border-white/10" />
            <DetailTable
              title="Ticket Details"
              rows={[
                ['Order ID', a.orderId],
                ['Ticket Type', a.ticketType],
                ['Quantity', a.quantity],
                ['Access Level', a.accessLevel],
                ['Gate', a.gate],
                ['Check-in Time', formatCheckIn(a.checkedInAt)],
              ]}
            />
            <hr className="border-0 border-t border-black/10 dark:border-white/10" />
            <DetailTable
              title="Add-ons"
              rows={a.addOns.map((x) => [x.name, x.quantity])}
              empty="No add-ons on this order."
            />
          </div>
        )}
      </Sheet>
      <Modal
        open={confirmRefund}
        onClose={() => { if (!busy) setConfirmRefund(false) }}
        title="Refund this ticket?"
        footer={
          <>
            <Button className="h-11 flex-1 text-body-lg font-medium" onClick={() => setConfirmRefund(false)} disabled={busy === 'refund'} data-autofocus>Cancel</Button>
            <Button variant="danger" className="h-11 flex-1 text-body-lg font-medium" loading={busy === 'refund'} onClick={refund}>Refund Ticket</Button>
          </>
        }
      >
        <p className="pb-2 text-body text-pretty text-fg-muted">
          {a ? `${a.name} gets their money back for order ${a.orderId} and the ticket stops working at the gate. This can’t be undone.` : ''}
        </p>
      </Modal>
    </>
  )
}

/** 60px round photo, or initials on gray-100 (Figma "Image Container"). */
function Avatar({ attendee }) {
  const initials = attendee.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return attendee.photo ? (
    <img src={attendee.photo} alt="" width="60" height="60" className="size-15 shrink-0 rounded-full bg-gray-100 object-cover" />
  ) : (
    <span aria-hidden className="flex size-15 shrink-0 items-center justify-center rounded-full bg-gray-100 text-body-lg font-medium text-fg-soft dark:bg-surface-muted">{initials}</span>
  )
}

/** Figma "Ticket Details" / "Add-ons": 16/24 title, bordered list — 224px label column, 20 × 12 cells. */
function DetailTable({ title, rows, empty }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body-lg font-medium text-fg">{title}</h3>
      {rows.length ? (
        <dl className="overflow-hidden rounded-lg border border-default">
          {rows.map(([label, value], i) => (
            <div key={label} className={i < rows.length - 1 ? 'grid grid-cols-[minmax(0,224fr)_minmax(0,166fr)] border-b border-default' : 'grid grid-cols-[minmax(0,224fr)_minmax(0,166fr)]'}>
              <dt className="truncate px-3 py-5 text-body text-fg">{label}</dt>
              <dd className="flex min-w-0 items-center py-5 pr-3 text-body text-fg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="rounded-lg border border-dashed border-default px-3 py-5 text-body text-fg-muted">{empty}</p>
      )}
    </section>
  )
}

export default Attendees
