import { useState } from 'react'
import { cn } from '@/lib/cn'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { TabsToolbar } from '@/components/layout/TabsToolbar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'
import { VoucherCard } from '@/components/data/VoucherCard'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import { useVouchers, demoVouchers, takeJustCreatedVoucher } from '@/data/voucherStore'
import voucherBody from '@/assets/illustrations/voucher-body.svg'
import voucherWindow from '@/assets/illustrations/voucher-window.svg'
import voucherBarcode from '@/assets/illustrations/voucher-barcode.svg'
import voucherStub from '@/assets/illustrations/voucher-stub.svg'

/**
 * E-Voucher — Figma "E-Voucher" (275:40818) and "E-Voucher - Empty States" (102:15122).
 * Route: #/event/:id/vouchers. Action bar with "Create New E-Voucher"; content 40 × 32 padding,
 * 318px template cards 16px apart, or the centred voucher-illustration empty state.
 *
 * Templates = the event's own (localStorage) after any demo templates the sample events ship
 * with. Newly created events start empty.
 *
 * @param {{ eventId: string }} props
 */
export function Vouchers({ eventId }) {
  const event = getEventDetail(eventId)
  const stored = useVouchers(eventId)
  const [newId] = useState(takeJustCreatedVoucher)
  const newHref = `#/event/${eventId}/vouchers/new`

  if (!event) return null // App only routes here for known events

  const templates = [...(demoVouchers[eventId] ?? []), ...stored]
  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="vouchers"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="vouchers" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: event.title }]}
      actions={headerActions}
      toolbar={<TabsToolbar action={<Button as="a" href={newHref} variant="glass">Create New E-Voucher</Button>} />}
    >
      <h1 className="sr-only">E-Voucher</h1>

      {templates.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-8.25rem)] items-center justify-center px-4 py-12">
          <EmptyState
            illustration={<VoucherIllustration />}
            title="No E-Voucher Templates Yet"
            className="max-w-125" /* wide enough for the description to sit on 2 lines */
            description="Design your first e-voucher template to get started. Customize the layout, add your branding, and attach it to any ticket type."
            actions={
              <>
                <Button as="a" href={newHref} variant="glass" className="h-11 text-label">Create E-Voucher</Button>
                <Button
                  variant="secondary"
                  className="h-11 rounded-lg px-3 text-label"
                  onClick={() => toast.info('Import is coming soon', { description: 'For now, create each template with Create E-Voucher.' })}
                >
                  Import E-Voucher
                </Button>
              </>
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,318px),318px))] gap-4 px-4 py-8 md:px-10">
          {templates.map((t, i) => (
            <li key={t.id} className={cn('enter-rise', t.id === newId && 'row-new')} style={{ '--enter-index': Math.min(i, 8) }}>
              <VoucherCard name={t.name} editedAt={t.updatedAt ?? t.createdAt} onManage={() => { window.location.hash = `#/event/${eventId}/vouchers/${t.id}` }} />
            </li>
          ))}
        </ul>
      )}

    </DashboardLayout>
  )
}

/**
 * Figma empty-state "Slot" (279 × 248): a perforated e-voucher — body with a barcode, three text
 * lines and four footer bars, plus the tear-off stub below. On first paint the voucher rises
 * in and the barcode wipes in from the left (rare moment, slight delight).
 */
function VoucherIllustration() {
  return (
    <div aria-hidden className="relative h-62 w-[279px] shrink-0 overflow-hidden">
      <div className="voucher-rise absolute top-5.5 left-[17px] flex w-61.5 flex-col gap-[4.92px]">
        <div className="relative h-[201.72px] w-61.5">
          <img src={voucherBody} alt="" width="249.022" height="204.742" className="absolute top-[-0.75px] left-[-1.5px] block h-[204.742px] w-[249.022px] max-w-none" />
          <img src={voucherWindow} alt="" width="226" height="145" className="absolute top-[28.31px] left-2.5 block h-[145px] w-[226px] max-w-none" />
          <img src={voucherBarcode} alt="" width="195" height="31" className="voucher-barcode absolute top-11 left-[25.5px] block h-[31px] w-[195px] max-w-none" />
          <div className="absolute top-[82px] left-[25.5px] flex w-[83px] flex-col gap-1">
            <span className="h-[5.887px] w-full rounded-[1.472px] bg-gray-400" />
            <span className="h-[5.887px] w-full rounded-[1.472px] bg-gray-400" />
            <span className="h-[5.887px] w-[33.853px] rounded-[1.472px] bg-gray-400" />
          </div>
          <div className="absolute top-[157px] left-[33.5px] flex w-[179px] gap-1">
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-[5.887px] flex-1 rounded-[1.472px] bg-gray-400" />)}
          </div>
        </div>
        <div className="relative h-[39.36px] w-61.5">
          <img src={voucherStub} alt="" width="249.022" height="42.3817" className="absolute top-[-0.756px] left-[-1.5px] block h-[42.3817px] w-[249.022px] max-w-none" />
        </div>
      </div>
    </div>
  )
}

export default Vouchers
