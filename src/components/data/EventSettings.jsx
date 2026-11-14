import { eventCategories } from '@/data/events'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { PageSection } from '@/components/layout/PageSection'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, Select } from '@/components/ui/Field'

/*
 * Event Settings tab — Figma "Settings" (node 184:20347): General, Fee Settings, Danger Zone.
 * Each form saves on its own; "Save Changes" stays disabled (Figma: 60% opacity) until
 * something changed. Danger actions ask for an inline confirmation first.
 * Saving is mocked (no API yet).
 */

const categoryOptions = eventCategories.map((c) => ({ value: c, label: c }))
const statusOptions = [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]
const currencyOptions = [{ value: 'USD', label: 'USD($)' }, { value: 'IDR', label: 'IDR(Rp)' }, { value: 'SGD', label: 'SGD(S$)' }, { value: 'EUR', label: 'EUR(€)' }]
const timezoneOptions = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB, UTC+7)' },
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA, UTC+8)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT, UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
]
const feeModelOptions = [{ value: 'buyer', label: 'Pass to Buyer' }, { value: 'organizer', label: 'Absorb Fee' }]
const taxLabelOptions = ['VAT', 'GST', 'PPN', 'Sales Tax'].map((t) => ({ value: t, label: t }))
const yesNoOptions = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]

const SLUG_PREFIX = 'yourplatform.com/e/'
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PERCENT_RE = /^\d{1,2}(\.\d{1,2})?%?$|^100%?$/

/** Form state with dirty tracking and a mocked save. */
function useSectionForm(initial, validate) {
  const [saved, setSaved] = useState(initial)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | saved
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])

  const dirty = Object.keys(values).some((k) => values[k] !== saved[k])

  const bind = (key) => ({
    name: key,
    value: values[key],
    onChange: (e) => {
      const next = { ...values, [key]: e.target.value }
      setValues(next)
      if (errors[key]) setErrors(validate(next))
      if (status === 'saved') setStatus('idle')
    },
  })

  function submit(e) {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    const first = Object.keys(nextErrors)[0]
    if (first) {
      e.currentTarget.elements.namedItem(first)?.focus()
      return
    }
    setStatus('saving')
    timer.current = setTimeout(() => {
      setSaved(values)
      setStatus('saved')
    }, 600)
  }

  /** Apply an external change (e.g. Unpublish) to both saved and edited values. */
  const sync = (patch) => {
    setSaved((s) => ({ ...s, ...patch }))
    setValues((v) => ({ ...v, ...patch }))
  }

  return { values, errors, status, dirty, bind, submit, sync }
}

/**
 * @param {{ settings: { general: object, fees: object } }} props
 */
export function EventSettings({ settings }) {
  const general = useSectionForm(settings.general, (v) => {
    const e = {}
    if (!v.name.trim()) e.name = 'Event name is required.'
    if (!SLUG_RE.test(v.slug)) e.slug = 'Use lowercase letters, numbers and hyphens.'
    return e
  })
  const fees = useSectionForm(settings.fees, (v) => {
    const e = {}
    if (!PERCENT_RE.test(v.serviceFee.trim())) e.serviceFee = 'Enter a percentage between 0 and 100.'
    if (!PERCENT_RE.test(v.processingFee.trim())) e.processingFee = 'Enter a percentage between 0 and 100.'
    if (!PERCENT_RE.test(v.taxRate.trim())) e.taxRate = 'Enter a percentage between 0 and 100.'
    return e
  })
  const [lifecycle, setLifecycle] = useState('active') // active | cancelled | deleted
  const published = general.values.status === 'published'

  return (
    <>
      {/* General — 24 top / 32 bottom, form card 12px padding, 28px before the button */}
      <PageSection title="General" className="pt-6 pb-8">
        <form noValidate onSubmit={general.submit} className={formCard} aria-label="General settings">
          <div className="grid w-full grid-cols-1 gap-x-3 gap-y-5 md:grid-cols-3">
            <Field label="Event Name" error={general.errors.name}>
              {({ id, describedBy, invalid }) => <TextInput id={id} placeholder="e.g. Jakarta Jazz Festival 2026" autoComplete="off" {...general.bind('name')} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label="Event Category">
              {({ id }) => <Select id={id} placeholder="Choose a category" options={categoryOptions} {...general.bind('category')} />}
            </Field>
            <Field label="Event Status">
              {({ id }) => <Select id={id} options={statusOptions} {...general.bind('status')} />}
            </Field>
            <Field label="Language">
              {({ id }) => <TextInput id={id} placeholder="e.g. English, Bahasa Indonesia" autoComplete="off" {...general.bind('language')} />}
            </Field>
            <Field label="Currency">
              {({ id }) => <Select id={id} options={currencyOptions} {...general.bind('currency')} />}
            </Field>
            <Field label="Timezone">
              {({ id }) => <Select id={id} options={timezoneOptions} {...general.bind('timezone')} />}
            </Field>
            <Field label="Event Slug / URL" error={general.errors.slug} className="md:col-span-3">
              {({ id, describedBy, invalid }) => (
                <SlugInput id={id} placeholder="your-event-name" {...general.bind('slug')} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
          </div>
          <SaveRow form={general} />
        </form>
      </PageSection>

      {/* Fee Settings — 32 bottom, 32px before the button */}
      <PageSection title="Fee Settings" className="pb-8">
        <form noValidate onSubmit={fees.submit} className={cn(formCard, 'gap-8')} aria-label="Fee settings">
          <div className="grid w-full grid-cols-1 gap-x-3 gap-y-5 md:grid-cols-3">
            <Field label="Fee Model" hint="Who covers the service fee">
              {({ id, describedBy }) => <Select id={id} options={feeModelOptions} {...fees.bind('feeModel')} aria-describedby={describedBy} />}
            </Field>
            <Field label="Service Fee" hint="Added to each ticket." error={fees.errors.serviceFee}>
              {({ id, describedBy, invalid }) => <TextInput id={id} inputMode="decimal" placeholder="e.g. 3%" autoComplete="off" {...fees.bind('serviceFee')} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label="Payment Processing Fee" hint="Applied per transaction" error={fees.errors.processingFee}>
              {({ id, describedBy, invalid }) => <TextInput id={id} inputMode="decimal" placeholder="e.g. 2%" autoComplete="off" {...fees.bind('processingFee')} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label="Tax Label" hint="Tax name shown to buyers at checkout.">
              {({ id, describedBy }) => <Select id={id} options={taxLabelOptions} {...fees.bind('taxLabel')} aria-describedby={describedBy} />}
            </Field>
            <Field label="Tax Rate" hint="Percentage applied to the ticket price." error={fees.errors.taxRate}>
              {({ id, describedBy, invalid }) => <TextInput id={id} inputMode="decimal" placeholder="e.g. 11%" autoComplete="off" {...fees.bind('taxRate')} aria-describedby={describedBy} invalid={invalid} />}
            </Field>
            <Field label="Tax Included in Price" hint="Tax is included in price, or added at checkout.">
              {({ id, describedBy }) => <Select id={id} options={yesNoOptions} {...fees.bind('taxIncluded')} aria-describedby={describedBy} />}
            </Field>
          </div>
          <SaveRow form={fees} />
        </form>
      </PageSection>

      {/* Danger Zone — red-400 border, rows 20px padding */}
      <PageSection title="Danger Zone" className="pb-8">
        <ul className="rounded-lg border border-red-400">
          <DangerRow
            title={published ? 'Unpublish Event' : 'Publish Event'}
            description={
              published
                ? 'Your event will be taken offline and no longer visible to the public. Existing orders will not be affected.'
                : 'Your event is offline. Publishing makes it visible to the public again.'
            }
            action={published ? 'Unpublish Event' : 'Publish Event'}
            confirm={published ? 'Unpublish' : null}
            disabled={lifecycle !== 'active'}
            onConfirm={() => general.sync({ status: published ? 'draft' : 'published' })}
          />
          <DangerRow
            title="Cancel Event"
            description="This will cancel your event and automatically notify all registered attendees via email."
            action="Cancel Event"
            confirm="Yes, cancel event"
            done={lifecycle === 'cancelled' ? 'Event cancelled. Attendees are being notified.' : null}
            disabled={lifecycle === 'deleted'}
            onConfirm={() => setLifecycle('cancelled')}
          />
          <DangerRow
            title="Delete Event"
            description="Permanently removes this event and all its data. This action cannot be undone."
            action="Delete Event"
            confirm="Delete permanently"
            done={lifecycle === 'deleted' ? 'Event deleted.' : null}
            onConfirm={() => setLifecycle('deleted')}
          />
        </ul>
      </PageSection>
    </>
  )
}

/* Figma form card: black/10 border, radius 12, 12px padding (11 + 1px border) */
const formCard = 'flex flex-col items-end gap-7 rounded-lg border border-default p-2.75'

function SaveRow({ form }) {
  return (
    <div className="flex items-center gap-3">
      <p role="status" className="status-fade text-body text-success-fg" data-visible={form.status === 'saved' || undefined}>
        {form.status === 'saved' ? 'Changes saved' : ''}
      </p>
      {/* Figma "Save Changes": 44px glass, 16/24 medium; 60% opacity until there are changes */}
      <Button
        type="submit"
        variant="glass"
        disabled={!form.dirty}
        loading={form.status === 'saving'}
        className="h-11 text-body-lg font-medium disabled:opacity-60"
      >
        Save Changes
      </Button>
    </div>
  )
}

/** URL field with the fixed host shown as a prefix; only the slug is editable. */
function SlugInput({ invalid, className, ...props }) {
  return (
    <div
      className={cn(
        'flex h-10 w-full min-w-0 items-center rounded-md border border-default bg-surface px-2.75 text-body',
        'transition-[border-color,box-shadow] duration-150 ease-out',
        'hover:border-strong focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20',
        invalid && 'border-danger focus-within:ring-danger/20',
        className,
      )}
    >
      <span aria-hidden className="shrink-0 text-fg">{SLUG_PREFIX}</span>
      <input
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle pointer-coarse:text-base"
        {...props}
      />
    </div>
  )
}

/**
 * Danger Zone row with an inline confirm step (no modal infrastructure yet).
 * `confirm` = null runs the action immediately (e.g. re-publishing is not destructive).
 */
function DangerRow({ title, description, action, confirm, done, disabled = false, onConfirm }) {
  const [asking, setAsking] = useState(false)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (asking) confirmRef.current?.focus()
  }, [asking])

  return (
    <li className="flex flex-col items-start gap-4 border-b border-default p-5 last:border-b-0 sm:flex-row sm:items-center sm:gap-10">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label text-fg">{title}</p>
        <p className={cn('text-body', done ? 'text-danger-fg' : 'text-fg-muted')} role={done ? 'status' : undefined}>
          {done ?? description}
        </p>
      </div>
      {!done && (
        asking ? (
          <div className="tab-fade flex shrink-0 items-center gap-2">
            <Button className={actionClass} onClick={() => setAsking(false)}>Keep</Button>
            <Button
              ref={confirmRef}
              variant="danger"
              className="h-9 rounded-lg px-3"
              onClick={() => { setAsking(false); onConfirm() }}
            >
              {confirm}
            </Button>
          </div>
        ) : (
          <Button className={actionClass} disabled={disabled} onClick={() => (confirm ? setAsking(true) : onConfirm())}>
            {action}
          </Button>
        )
      )}
    </li>
  )
}

/* Figma secondary "_Base Buttons": 36px, radius 12, 12 × 10 padding, 14/20 medium */
const actionClass = 'h-9 rounded-lg px-2.75 text-shadow-button'

export default EventSettings
