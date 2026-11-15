import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EventSwitcher } from '@/components/layout/EventSwitcher'
import { Table } from '@/components/data/Table'
import { Pagination } from '@/components/data/Pagination'
import { ConfirmDeletePromo } from '@/components/data/ConfirmDeletePromo'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { toast } from '@/components/ui/Toast'
import { headerActions } from '@/data/dashboard'
import { getEventDetail, eventNavigation } from '@/data/eventDetail'
import { usePromoCodes, ensureDemoPromoCodes, updatePromoCode, typeLabel, formatValue, formatLongDate, promoStatus, isUsedUp, usageHistory } from '@/data/promoStore'
import copyIcon from '@/assets/icons/copy.svg'
import trashIcon from '@/assets/icons/trash.svg'

/*
 * Promo Code Details — Figma node 270:33157. Route: #/event/:id/promo/:codeId.
 * Title (label, 24/32 code + copy, Edit / Delete), a divider, the stats row (120px items
 * between vertical dividers), a status banner, then "Usage History" — a 7-column table with
 * pagination inside its frame.
 */

const columns = [
  { key: 'orderId', header: 'Order ID' },
  { key: 'buyer', header: 'Buyer Name' },
  { key: 'ticketType', header: 'Ticket Type' },
  { key: 'discount', header: 'Discount Applied' },
  { key: 'before', header: 'Total Before' },
  { key: 'after', header: 'Total After' },
  { key: 'redeemedAt', header: 'Redeemed At' },
]
const enter = (index) => ({ '--enter-index': index })

/** @param {{ eventId: string, codeId: string }} props */
export function PromoCodeDetail({ eventId, codeId }) {
  const event = useMemo(() => getEventDetail(eventId), [eventId])
  useState(() => ensureDemoPromoCodes(eventId))
  const codes = usePromoCodes(eventId)
  const promo = codes.find((p) => p.id === codeId) ?? null
  const listHref = `#/event/${eventId}/promo`
  const [deleting, setDeleting] = useState(null)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const deleted = useRef(false)

  const history = useMemo(() => (promo && event ? usageHistory(promo, event.ticketTypes) : []), [promo, event])
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize))
  const current = Math.min(page, pageCount)
  useEffect(() => { setPage(1) }, [pageSize])

  // Unknown code (deleted elsewhere, or a stale link) → back to the list
  useEffect(() => {
    if (event && !promo && !deleted.current) {
      window.location.replace(listHref)
      toast.error('Promo code not found', { description: 'It may have been deleted. Pick one from the list.' })
    }
  }, [event, promo, listHref])

  if (!event || !promo) return null

  const status = promoStatus(promo)
  const stats = [
    ['Discount Type', typeLabel[promo.type]],
    ['Discount Value', formatValue(promo)],
    ['Usage', promo.maxUsage == null ? `${promo.used.toLocaleString('en-US')} used` : `${promo.used.toLocaleString('en-US')} out of ${promo.maxUsage.toLocaleString('en-US')}`],
    ['Max Usage', promo.maxUsage == null ? 'Unlimited' : promo.maxUsage.toLocaleString('en-US')],
    ['Start Date', promo.start ? formatLongDate(promo.start) : 'Anytime'],
    ['End Date', promo.end ? formatLongDate(promo.end) : 'No end date'],
  ]

  function enable() {
    try {
      updatePromoCode(eventId, promo.id, { active: true })
      toast.success('Promo code enabled', { description: `Buyers can use ${promo.code} at checkout again.` })
    } catch {
      toast.error('Couldn’t update the code', { description: 'Browser storage is unavailable.' })
    }
  }

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={eventNavigation(event.id)}
      activeId="promo"
      sidebarTop={<EventSwitcher eventId={event.id} title={event.title} section="promo" />}
      breadcrumb={[{ label: 'Events', href: '#/events' }, { label: 'Discount & Promo Code', href: listHref }, { label: 'Promo Code Details' }]}
      actions={headerActions}
    >
      {/* Figma "Promo Code Details": 32px sides, 28px vertical, 20px gaps */}
      <section className="enter-rise flex flex-col gap-5 px-4 py-7 md:px-8" style={enter(0)} aria-labelledby="promo-code">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-body-lg text-fg opacity-60">Promo Code</p>
            <div className="flex items-center gap-3">
              <h1 id="promo-code" className="text-h2 font-semibold tracking-normal text-fg">{promo.code}</h1>
              <CopyButton text={promo.code} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button as="a" href={`${listHref}/${promo.id}/edit`} className="h-9 rounded-lg px-3 text-label text-shadow-button">Edit Promo Code</Button>
            <button
              type="button"
              onClick={() => setDeleting(promo)}
              aria-label={`Delete ${promo.code}`}
              title="Delete promo code"
              className="press flex size-9 cursor-pointer items-center justify-center rounded-control border border-black/12 bg-control shadow-control outline-none transition-[background-color] duration-150 hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-primary/20 dark:border-default"
            >
              <Icon src={trashIcon} />
            </button>
          </div>
        </div>

        <hr className="border-0 border-t border-black/10 dark:border-white/10" />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:items-stretch sm:gap-6">
          {stats.map(([label, value], i) => (
            <div key={label} className="contents">
              {i > 0 && <span aria-hidden className="hidden w-px self-stretch bg-black/10 sm:block dark:bg-white/10" />}
              <div className="flex min-w-30 flex-col gap-1">
                <dt className="text-body text-fg opacity-60">{label}</dt>
                <dd className="text-body-lg font-medium whitespace-nowrap text-fg tabular-nums">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <Banner>
          <StatusMessage promo={promo} statusKey={status.key} onEnable={enable} />
        </Banner>
      </section>

      <section className="enter-rise flex flex-col gap-3 px-4 pb-8 md:px-8" style={enter(1)} aria-labelledby="usage-history">
        <h2 id="usage-history" className="text-body-lg font-medium text-fg">Usage History</h2>
        <div>
          <Table
            caption={`Orders that used ${promo.code}`}
            columns={columns}
            data={history.slice((current - 1) * pageSize, current * pageSize)}
            rowKey={(r) => r.id}
            emptyState={`No one has used ${promo.code} yet — redemptions show up here as orders come in.`}
            className={history.length ? 'rounded-b-none' : undefined}
          />
          {history.length > 0 && (
            <Pagination page={current} pageCount={pageCount} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} className="rounded-b-lg border border-t-0 border-default bg-surface" />
          )}
        </div>
      </section>

      <ConfirmDeletePromo
        eventId={eventId}
        promo={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { deleted.current = true; window.location.hash = listHref }}
      />
    </DashboardLayout>
  )
}

/** What the code does for buyers right now — Figma "Banner" slot. */
function StatusMessage({ promo, statusKey, onEnable }) {
  const { code } = promo
  if (!promo.active) {
    return (
      <>
        {code} is switched off — buyers can’t use it.{' '}
        <button type="button" onClick={onEnable} className="cursor-pointer rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/30">Enable code</button>
      </>
    )
  }
  if (isUsedUp(promo)) return `${code} reached its limit of ${promo.maxUsage.toLocaleString('en-US')} uses. Raise the max usage to keep it going.`
  if (statusKey === 'expired') return `${code} ended on ${formatLongDate(promo.end)}. Edit the dates to run it again.`
  if (statusKey === 'scheduled') return `${code} goes live on ${formatLongDate(promo.start)} — buyers can’t use it before then.`
  const left = promo.maxUsage == null ? null : promo.maxUsage - promo.used
  return `Buyers can use ${code} at checkout${promo.end ? ` until ${formatLongDate(promo.end)}` : ''}${left == null ? ', with no usage limit.' : ` — ${left.toLocaleString('en-US')} of ${promo.maxUsage.toLocaleString('en-US')} uses left.`}`
}

/** Figma "Copy" (20px): copies the code and swaps to a check for 1.5s. */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Couldn’t copy', { description: 'Your browser blocked clipboard access — select the code and copy it instead.' })
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : `Copy ${text}`}
      title={copied ? 'Copied' : 'Copy code'}
      className="press relative flex size-5 cursor-pointer items-center justify-center rounded-xs outline-none before:absolute before:-inset-2.5 before:content-[''] hover:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {copied
        ? <Check key="ok" aria-hidden className="badge-swap size-5 text-success-fg" strokeWidth={2.25} />
        : <Icon key="copy" src={copyIcon} className="badge-swap size-5" />}
      <span role="status" className="sr-only">{copied ? 'Copied to clipboard' : ''}</span>
    </button>
  )
}

export default PromoCodeDetail
