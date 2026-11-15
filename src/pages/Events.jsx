import { useState } from 'react'
import { cn } from '@/lib/cn'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { TabsToolbar } from '@/components/layout/TabsToolbar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import { EventListItem } from '@/components/data/EventListItem'
import { navigation } from '@/data/navigation'
import { headerActions } from '@/data/dashboard'
import { eventsBreadcrumb, eventTabs } from '@/data/events'
import { useStoredEvents, takeJustCreated } from '@/data/eventStore'
import { useAllTickets, summarizeTickets } from '@/data/ticketStore'
import eventsEmpty from '@/assets/illustrations/events-empty.svg'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Events list — Figma "Event List" (node 274:36462). Starts empty; rows come from events
 * created via "Add New Event" (#/events/new), saved in localStorage, newest first.
 * Capacity, sold and price range come from each event's ticket types. Events without a date
 * yet count as upcoming.
 */
export function Events() {
  const [tab, setTab] = useState('upcoming')
  const stored = useStoredEvents()
  const tickets = useAllTickets()
  const [newId] = useState(takeJustCreated)
  const now = today()
  const events = stored.filter((e) => (tab === 'past' ? e.date && e.date < now : !e.date || e.date >= now))

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={navigation}
      activeId="events"
      breadcrumb={eventsBreadcrumb}
      actions={headerActions}
      toolbar={
        <TabsToolbar
          tabs={eventTabs}
          value={tab}
          onChange={setTab}
          idPrefix="events"
          label="Events"
          action={<Button as="a" href="#/events/new" variant="glass">Add New Event</Button>}
        />
      }
    >
      <h1 className="sr-only">Events</h1>

      <section role="tabpanel" id={`events-panel-${tab}`} aria-labelledby={`events-tab-${tab}`} className={cn(events.length > 0 && 'px-4 py-6 md:px-8')}>
        {events.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {events.map(({ id, banner, description, settings, createdAt, ...event }, i) => (
              <li key={id} className={cn('enter-rise', id === newId && 'row-new')} style={{ '--enter-index': Math.min(i, 8) }}>
                <EventListItem
                  {...event}
                  {...summarizeTickets(tickets[id] ?? [])}
                  cover={banner ? { src: banner, alt: '' } : null}
                  href={`#/event/${id}`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-[calc(100dvh-8.25rem)] items-center justify-center px-4 py-12">
            <EmptyState
              illustration={
                <div aria-hidden className="enter-rise flex h-62 w-[279px] shrink-0 items-center justify-center">
                  <img src={eventsEmpty} alt="" width="279" height="247.377" className="block h-[247.377px] w-[279px] max-w-none" />
                </div>
              }
              title={tab === 'past' ? 'No Past Events' : 'No Upcoming Events'}
              description={
                tab === 'past'
                  ? 'Events will show up here once their date has passed.'
                  : 'Create a new event to start selling tickets and managing registrations.'
              }
              actions={
                tab === 'past' ? null : (
                  <>
                    <Button as="a" href="#/events/new" variant="glass" className="h-11 text-body-lg font-medium">Create New Event</Button>
                    <Button
                      variant="secondary"
                      className="h-11 rounded-lg px-3 text-body-lg font-medium"
                      onClick={() => toast.info('Import is coming soon', { description: 'For now, create each event with Create New Event.' })}
                    >
                      Import Event
                    </Button>
                  </>
                )
              }
            />
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}

export default Events
