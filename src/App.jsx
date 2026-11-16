import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
import Payout from '@/pages/Payout'
import Account from '@/pages/Account'
import EventDashboard from '@/pages/EventDashboard'
import CreateEvent from '@/pages/CreateEvent'
import { Toaster } from '@/components/ui/Toast'
import SeatingChart from '@/pages/SeatingChart'
import CreateSeatingChart from '@/pages/CreateSeatingChart'
import SeatingEditor from '@/pages/SeatingEditor'
import Attendees from '@/pages/Attendees'
import PromoCodes from '@/pages/PromoCodes'
import PromoCodeDetail from '@/pages/PromoCodeDetail'
import PromoCodeForm from '@/pages/PromoCodeForm'
import TicketList from '@/pages/TicketList'
import CreateTicket from '@/pages/CreateTicket'
import CreateAddOn from '@/pages/CreateAddOn'
import Vouchers from '@/pages/Vouchers'
import VoucherEditor from '@/pages/VoucherEditor'
import { getEventDetail } from '@/data/eventDetail'
import { useHashRoute } from '@/hooks/useHashRoute'

const pages = { events: Events, wallet: Payout, account: Account }

export default function App() {
  const route = useHashRoute('dashboard')
  return (
    <>
      <Route key={route} route={route} />
      {/* Outside the routed page so toasts survive navigation (e.g. create event → list) */}
      <Toaster />
    </>
  )
}

function Route({ route }) {
  const [page, id, section, sub, action] = route.split('/')

  if (route === 'events/new') return <CreateEvent />

  // #/event/:id[/section] — event-scoped dashboard
  if (page === 'event' && id && section === 'seating' && getEventDetail(id)) {
    if (sub === 'new') return <CreateSeatingChart eventId={id} />
    if (sub) return <SeatingEditor eventId={id} chartId={sub} />
    return <SeatingChart eventId={id} />
  }
  if (page === 'event' && id && section === 'attendees' && getEventDetail(id)) return <Attendees eventId={id} />
  if (page === 'event' && id && section === 'promo' && getEventDetail(id)) {
    if (sub === 'new') return <PromoCodeForm eventId={id} />
    if (sub && action === 'edit') return <PromoCodeForm eventId={id} codeId={sub} />
    if (sub) return <PromoCodeDetail eventId={id} codeId={sub} />
    return <PromoCodes eventId={id} />
  }
  if (page === 'event' && id && section === 'vouchers' && getEventDetail(id)) {
    if (sub) return <VoucherEditor eventId={id} voucherId={sub === 'new' ? null : sub} />
    return <Vouchers eventId={id} />
  }
  if (page === 'event' && id && section === 'tickets' && getEventDetail(id)) {
    if (sub === 'new') return <CreateTicket eventId={id} />
    if (sub === 'addons' && action === 'new') return <CreateAddOn eventId={id} />
    if (sub && sub !== 'addons' && action === 'edit') return <CreateTicket eventId={id} ticketId={sub} />
    return <TicketList eventId={id} initialTab={sub === 'addons' ? 'addons' : 'types'} />
  }
  if (page === 'event' && id) return <EventDashboard eventId={id} section={section} />

  const Page = pages[page] ?? Dashboard
  return <Page />
}
