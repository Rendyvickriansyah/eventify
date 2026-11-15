import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { TabsToolbar } from '@/components/layout/TabsToolbar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu } from '@/components/ui/Menu'
import { toast } from '@/components/ui/Toast'
import { Table } from '@/components/data/Table'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import { useTickets, removeTicket, duplicateTicket, takeJustCreatedTicket } from '@/data/ticketStore'
import { useAddOns, removeAddOn, duplicateAddOn, demoAddOns, takeJustCreatedAddOn } from '@/data/addonStore'
import moreIcon from '@/assets/icons/more-horizontal.svg'
import { TicketIllustration } from '@/components/data/TicketIllustration'

const tabs = [
  { id: 'types', label: 'Ticket Type' },
  { id: 'addons', label: 'Add-ons' },
]

const int = new Intl.NumberFormat('en-US')
const price = (n) => (n === 0 ? 'Free' : `$${n.toLocaleString('en-US')}`)
const soldOf = (row, total) => `${int.format(row.sold)} / ${int.format(total)}`

/** Copy per tab: empty state, toolbar action, import hint. */
const copy = {
  types: {
    action: 'Add New Ticket',
    create: 'Create Ticket',
    import: 'Import Ticket',
    title: 'No tickets yet',
    description: 'Create your first ticket type to start selling. You can add multiple ticket tiers, set pricing, and control availability.',
    importHint: 'For now, create each ticket type with Create Ticket.',
    caption: 'Ticket types',
    noun: 'ticket type',
  },
  addons: {
    action: 'Add New Add-Ons',
    create: 'Create Add-Ons',
    import: 'Import Add-Ons',
    title: 'No Add-Ons Yet',
    description: 'Add parking passes, merchandise, or special experiences to give more options at checkout.',
    importHint: 'For now, create each add-on with Create Add-Ons.',
    caption: 'Add-ons',
    noun: 'add-on',
  },
}

/**
 * Ticket List — Figma "Ticket List" (240:28645) + empty state (103:15825), and the Add-ons tab
 * — Figma "Add ons" (274:39893) + empty state (240:28816). Route: #/event/:id/tickets.
 * Both tabs share the toolbar, the ticket-illustration empty state, the table and the ⋯ menu;
 * the action follows the tab ("Add New Ticket" → wizard, "Add New Add-Ons" → single-step page).
 * #/event/:id/tickets/addons opens straight on the Add-ons tab.
 *
 * Rows = the event's own items (localStorage) after any demo rows the sample events ship with.
 * Newly created events start empty.
 *
 * @param {{ eventId: string, initialTab?: 'types' | 'addons' }} props
 */
export function TicketList({ eventId, initialTab = 'types' }) {
  const event = getEventDetail(eventId)
  const [tab, setTab] = useState(initialTab)
  const storedTickets = useTickets(eventId)
  const storedAddOns = useAddOns(eventId)
  const [newTicketId] = useState(takeJustCreatedTicket)
  const [newAddOnId] = useState(takeJustCreatedAddOn)

  if (!event) return null // App only routes here for known events

  const isAddOns = tab === 'addons'
  const text = copy[tab]

  const ticketRows = [
    ...(event.demo ? event.ticketTypes.map((t) => ({ id: `demo-${t.id}`, name: t.name, sold: t.sold, quantity: t.capacity, price: t.price, demo: true })) : []),
    ...storedTickets,
  ]
  const addOnRows = [...(demoAddOns[eventId] ?? []).map((a) => ({ ...a, demo: true })), ...storedAddOns]

  /** ⋯ menu shared by both tables. Demo rows and rows with sales can't be deleted. */
  const actionsColumn = (noun, onDuplicate, onRemove) => ({
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    className: 'w-25 py-0',
    render: (row) => (
      <Menu
        icon={moreIcon}
        label={`More actions for ${row.name}`}
        items={[
          {
            id: 'duplicate',
            icon: Copy,
            label: 'Duplicate',
            onSelect: () => (row.demo
              ? toast.info(`Sample ${noun}s can’t be copied`, { description: `Create a new ${noun} instead.` })
              : onDuplicate(eventId, row.id)),
          },
          { id: 'sep', type: 'separator' },
          {
            id: 'delete',
            icon: Trash2,
            label: row.sold > 0 ? 'Delete (has sales)' : 'Delete',
            tone: 'danger',
            disabled: row.demo || row.sold > 0,
            onSelect: () => {
              onRemove(eventId, row.id)
              toast.info(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`, { description: `“${row.name}” was removed from this event.` })
            },
          },
        ]}
        className="-mr-1"
      />
    ),
  })

  const columns = isAddOns
    ? [
        { key: 'name', header: 'Add-On Name', render: (row) => row.name },
        { key: 'category', header: 'Category', render: (row) => row.category },
        { key: 'price', header: 'Price', render: (row) => price(row.price) },
        { key: 'stock', header: 'Sold / Stock', render: (row) => soldOf(row, row.stock) },
        actionsColumn('add-on', duplicateAddOn, removeAddOn),
      ]
    : [
        { key: 'name', header: 'Ticket Type', render: (row) => row.name },
        { key: 'quantity', header: 'Quantity', render: (row) => soldOf(row, row.quantity) },
        { key: 'price', header: 'Price Per Unit', render: (row) => price(row.price) },
        actionsColumn('ticket type', duplicateTicket, removeTicket),
      ]

  const rows = isAddOns ? addOnRows : ticketRows
  const newId = isAddOns ? newAddOnId : newTicketId
  const createProps = { as: 'a', href: isAddOns ? `#/event/${eventId}/tickets/addons/new` : `#/event/${eventId}/tickets/new` }

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="tickets"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="tickets" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
      toolbar={
        <TabsToolbar
          tabs={tabs}
          value={tab}
          onChange={setTab}
          idPrefix="tickets"
          label="Ticket sections"
          action={<Button variant="glass" {...createProps}>{text.action}</Button>}
        />
      }
    >
      <h1 className="sr-only">Ticket List</h1>
      <section role="tabpanel" id={`tickets-panel-${tab}`} aria-labelledby={`tickets-tab-${tab}`} key={tab} className="tab-fade">
        {rows.length === 0 ? (
          <Centered>
            <EmptyState
              illustration={<TicketIllustration />}
              title={text.title}
              description={text.description}
              actions={
                <>
                  <Button variant="glass" className="h-11 text-label" {...createProps}>{text.create}</Button>
                  <Button
                    variant="secondary"
                    className="h-11 rounded-lg px-3 text-label"
                    onClick={() => toast.info('Import is coming soon', { description: text.importHint })}
                  >
                    {text.import}
                  </Button>
                </>
              }
            />
          </Centered>
        ) : (
          /* Figma content padding: 20 × 16 on Ticket Type, 16 all round on Add-ons */
          <div className={cn('px-4 py-4', !isAddOns && 'md:px-5')}>
            <Table
              caption={`${text.caption} for ${event.title}`}
              columns={columns}
              data={rows}
              rowKey={(row) => row.id}
              rowClassName={(row) => cn('enter-rise', row.id === newId && 'row-flash')}
              rowStyle={(_, i) => ({ '--enter-index': Math.min(i, 8) })}
            />
          </div>
        )}
      </section>

    </DashboardLayout>
  )
}

/** Centres content in the space under the toolbar (72px header + 60px toolbar). */
function Centered({ children }) {
  return <div className="flex min-h-[calc(100dvh-8.25rem)] items-center justify-center px-4 py-12">{children}</div>
}

/**
 * Figma empty-state "Slot" (279 × 248): two ticket outlines — the back one tilted −16.11°, the
 * front one flat and lower. They drift into place on first paint (rare moment, slight delight).
 */

export default TicketList
