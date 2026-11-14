import { useRef, useState } from 'react'
import { WizardShell, WizardHeading, useWizardEffects } from '@/components/layout/Wizard'
import { Field, TextInput, TextArea, DateInput, TimeInput, OptionalTag, Counter } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { SettingsGroups } from '@/components/ui/SettingToggle'
import { toast } from '@/components/ui/Toast'
import { getEventDetail } from '@/data/eventDetail'
import { addTicket } from '@/data/ticketStore'
import dollarIcon from '@/assets/icons/dollar.svg'

/*
 * Add New Ticket — Figma "Add New Ticket (Step 1)" (93:11151) and "(Step 2)" (97:12764); on
 * success it returns to the Ticket List with a success toast (step 3 = "Publish").
 * Route: #/event/:id/tickets/new. Same shell as Create New Event (WizardShell).
 */

const steps = [
  { id: 'setup', label: 'Setup New Ticket' },
  { id: 'advanced', label: 'Advance Ticket Settings' },
  { id: 'publish', label: 'Publish' },
]

const advancedGroups = [
  {
    title: 'Access & Entry',
    items: [
      { key: 'ageVerification', heading: 'Age Restriction', hint: 'Require buyers to confirm they meet the minimum age requirement', label: 'Enable age verification prompt', description: 'Buyers must confirm their age before completing the purchase.' },
      { key: 'idRequired', heading: 'ID Required at Entry', hint: 'Inform attendees that a valid ID is required for check-in', label: 'Require ID at check-in', description: 'A reminder will be shown during checkout and on the ticket that attendees must present a valid ID at the door' },
      { key: 'multipleEntries', heading: 'Multiple Entry', hint: 'Allow ticket holders to enter and exit the venue multiple times', label: 'Enable multiple entries', description: 'The ticket can be scanned more than once, useful for multi-day or multi-session events' },
    ],
  },
  {
    title: 'Visibility',
    items: [
      { key: 'hidden', heading: 'Hide from Event Page', hint: "This ticket won't appear on your public event page", label: 'Hide this ticket from the event page', description: 'Ticket will only be accessible via direct link or access code' },
    ],
  },
  {
    title: 'Purchase Rules',
    items: [
      { key: 'waitlist', heading: 'Enable Waitlist', hint: 'Allow buyers to join a waitlist when this ticket is sold out', label: 'Enable waitlist when sold out', description: 'Buyers on the waitlist will be notified automatically if a spot becomes available' },
      { key: 'transfer', heading: 'Allow Ticket Transfer', hint: 'Let attendees transfer their ticket to someone else', label: 'Allow ticket transfer', description: 'Attendees can reassign their ticket to another person through the platform' },
    ],
  },
  {
    title: 'Fees & Tax',
    items: [
      { key: 'absorbFee', heading: 'Absorb Transaction Fee', hint: 'Cover the platform fee so buyers see an all-in price', label: 'Absorb transaction fee', description: "The platform fee will be deducted from your earnings instead of being added to the buyer's total" },
      { key: 'taxIncluded', heading: 'Tax Display', hint: 'Control how tax is shown to buyers at checkout', label: 'Include tax in displayed price', description: "The ticket price shown already includes tax. Buyers won't see a separate tax line at checkout" },
    ],
  },
]

const emptySettings = Object.fromEntries(advancedGroups.flatMap((g) => g.items.map((i) => [i.key, false])))
const NAME_MAX = 60
const today = () => new Date().toISOString().slice(0, 10)
const digits = (v) => v.replace(/[^0-9]/g, '')
const toInt = (v) => (v === '' ? NaN : Number(v))
const toPrice = (v) => (v === '' ? NaN : Number(v.replace(/,/g, '')))

function validate(f) {
  const e = {}
  const qty = toInt(f.quantity)
  const min = toInt(f.minPerOrder)
  const max = toInt(f.maxPerOrder)
  if (!f.name.trim()) e.name = 'Give this ticket a name buyers will recognise, like “Early Bird”.'
  if (!(qty >= 1)) e.quantity = 'Enter how many tickets are available (at least 1).'
  if (!(toPrice(f.price) >= 0)) e.price = 'Enter a price. Use 0 for a free ticket.'
  if (!(min >= 1)) e.minPerOrder = 'At least 1 ticket per order.'
  if (!(max >= 1)) e.maxPerOrder = 'At least 1 ticket per order.'
  else if (min >= 1 && max < min) e.maxPerOrder = `Can't be lower than the minimum (${min}).`
  else if (qty >= 1 && max > qty) e.maxPerOrder = `Can't be more than the available quantity (${qty}).`
  if (!f.salesStartDate) e.salesStartDate = 'Pick when sales open.'
  if (f.salesEndDate && f.salesStartDate) {
    const start = `${f.salesStartDate}T${f.salesStartTime || '00:00'}`
    const end = `${f.salesEndDate}T${f.salesEndTime || '23:59'}`
    if (end <= start) e.salesEndDate = 'Sales must end after they start.'
  }
  return e
}

/** @param {{ eventId: string }} props */
export function CreateTicket({ eventId }) {
  const event = getEventDetail(eventId)
  const listHref = `#/event/${eventId}/tickets`
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [form, setForm] = useState({
    name: '', description: '', quantity: '', price: '', minPerOrder: '1', maxPerOrder: '10',
    salesStartDate: today(), salesStartTime: '09:00', salesEndDate: '', salesEndTime: '',
    accessCode: '',
  })
  const [settings, setSettings] = useState(emptySettings)
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const nameRef = useRef(null)
  const headingRef = useRef(null)

  const dirty = Boolean(form.name || form.description || form.quantity || form.price || form.accessCode) || Object.values(settings).some(Boolean)
  useWizardEffects({ step, formRef, firstFieldRef: nameRef, headingRef, attempt, dirty: dirty && !saving })

  if (!event) return null // App only routes here for known events

  // Re-validate a field only once it has shown an error (errors clear as soon as it's fixed).
  const setValue = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (Object.keys(errors).length) {
      const fresh = validate(next)
      setErrors((err) => Object.fromEntries(Object.keys(err).filter((k) => fresh[k]).map((k) => [k, fresh[k]])))
    }
  }
  const bind = (key, transform = (v) => v) => ({
    name: key,
    value: form[key],
    onChange: (e) => setValue(key, transform(e.target.value)),
  })
  const fieldProps = ({ id, describedBy, invalid }) => ({ id, 'aria-describedby': describedBy, invalid })

  function go(next) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
  }

  function close() {
    if (dirty && !window.confirm('Discard this ticket? What you entered will be lost.')) return
    window.location.hash = listHref
  }

  function continueToAdvanced(e) {
    e.preventDefault()
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) {
      setAttempt((n) => n + 1)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    go(1)
  }

  async function create(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    go(2)
    await new Promise((r) => setTimeout(r, 600)) // brief "Publish" beat; no API yet
    const name = form.name.trim()
    try {
      addTicket(eventId, {
        name,
        description: form.description.trim(),
        quantity: toInt(form.quantity),
        price: toPrice(form.price),
        minPerOrder: toInt(form.minPerOrder),
        maxPerOrder: toInt(form.maxPerOrder),
        salesStart: `${form.salesStartDate}T${form.salesStartTime || '00:00'}`,
        salesEnd: form.salesEndDate ? `${form.salesEndDate}T${form.salesEndTime || '23:59'}` : '',
        accessCode: form.accessCode.trim(),
        settings,
      })
    } catch {
      setSaving(false)
      go(1)
      toast.error('Could not save the ticket', { description: 'Browser storage is full or unavailable. Free up space and try again.' })
      return
    }
    window.location.hash = listHref
    toast.success('Ticket Created Successfully', {
      description: `“${name}” is ready to sell. Buyers can purchase it as soon as sales open.`,
    })
  }

  const enabledCount = Object.values(settings).filter(Boolean).length

  return (
    <WizardShell
      title="Setup New Ticket"
      steps={steps}
      current={step}
      direction={direction}
      onClose={close}
      closeLabel="Close and return to the ticket list"
      formId="create-ticket"
      formRef={formRef}
      onSubmit={step === 0 ? continueToAdvanced : create}
      note={
        step === 0 ? `Step 1 of 3 · ${event.title}`
          : step === 1 ? (enabledCount ? `${enabledCount} of 8 options enabled · all optional` : 'All optional · you can change these later')
          : 'Publishing your ticket…'
      }
      onBack={step > 0 ? () => go(0) : undefined}
      submitLabel={step === 0 ? 'Continue' : 'Create Ticket'}
      busy={saving}
      busyLabel="Creating ticket…"
    >
      {step === 0 ? (
        <>
          <WizardHeading title="Setup New Ticket" description="Configure ticket types, pricing, and availability for this event" />
          <div className="flex flex-col gap-5">
            <Field label="Ticket Name" error={errors.name} className="min-h-0" aside={<Counter value={form.name.length} max={NAME_MAX} showFrom={NAME_MAX - 15} />}>
              {(ids) => <TextInput ref={nameRef} {...fieldProps(ids)} {...bind('name')} placeholder="e.g. Early Bird, VIP, Regular" autoComplete="off" maxLength={NAME_MAX} data-1p-ignore />}
            </Field>
            <Field label="Description" className="min-h-0" aside={<OptionalTag />}>
              {(ids) => <TextArea {...fieldProps(ids)} {...bind('description')} placeholder="What's included? e.g. Front-row seating, a welcome drink and fast-track entry" maxLength={500} />}
            </Field>
            <Field label="Available Quantity" error={errors.quantity} className="min-h-0">
              {(ids) => <TextInput {...fieldProps(ids)} {...bind('quantity', digits)} inputMode="numeric" placeholder="e.g. 500" autoComplete="off" className="tabular-nums" />}
            </Field>
            <Field label="Price" error={errors.price} hint={errors.price ? undefined : 'Price per ticket in USD. Enter 0 for a free ticket.'} className="min-h-0">
              {(ids) => (
                <TextInput
                  {...fieldProps(ids)}
                  {...bind('price', (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1'))}
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  className="tabular-nums"
                  leading={<Icon src={dollarIcon} />}
                />
              )}
            </Field>
            <FieldRow>
              <Field label="Min Qty Ticket Per Order" error={errors.minPerOrder} className="min-h-0">
                {(ids) => <TextInput {...fieldProps(ids)} {...bind('minPerOrder', digits)} inputMode="numeric" placeholder="e.g. 1" autoComplete="off" className="tabular-nums" />}
              </Field>
              <Field label="Max Qty Ticket Per Order" error={errors.maxPerOrder} className="min-h-0">
                {(ids) => <TextInput {...fieldProps(ids)} {...bind('maxPerOrder', digits)} inputMode="numeric" placeholder="e.g. 10" autoComplete="off" className="tabular-nums" />}
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Sales Start Date" error={errors.salesStartDate} className="min-h-0">
                {(ids) => <DateInput {...fieldProps(ids)} {...bind('salesStartDate')} time={form.salesStartTime} onTimeChange={(t) => setValue('salesStartTime', t)} />}
              </Field>
              <Field label="Start Time" className="min-h-0">
                {(ids) => <TimeInput {...fieldProps(ids)} {...bind('salesStartTime')} />}
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="Sales End Date" error={errors.salesEndDate} hint={errors.salesEndDate ? undefined : 'Leave empty to keep selling until the event starts.'} className="min-h-0">
                {(ids) => <DateInput {...fieldProps(ids)} {...bind('salesEndDate')} min={form.salesStartDate || undefined} time={form.salesEndTime} onTimeChange={(t) => setValue('salesEndTime', t)} />}
              </Field>
              <Field label="End Time" className="min-h-0">
                {(ids) => <TimeInput {...fieldProps(ids)} {...bind('salesEndTime')} disabled={!form.salesEndDate} />}
              </Field>
            </FieldRow>
          </div>
        </>
      ) : (
        <>
          <WizardHeading title="Advanced Settings" optional headingRef={headingRef} description="Fine-tune access, purchase rules, and policies for this ticket type" />
          <div className="flex flex-col gap-6">
            <Field label="Access Code" hint="Buyers need this code to see or buy the ticket." className="min-h-0" aside={<OptionalTag />}>
              {(ids) => (
                <TextInput
                  {...fieldProps(ids)}
                  {...bind('accessCode', (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  placeholder="e.g. VIPGUEST2026"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                  className="font-medium tracking-wide"
                />
              )}
            </Field>
            <SettingsGroups
              groups={advancedGroups}
              values={settings}
              onChange={(key, checked) => setSettings((s) => ({ ...s, [key]: checked }))}
              disabled={saving}
              dividedFirst
            />
          </div>
        </>
      )}
    </WizardShell>
  )
}

/** Figma "Row": two fields side by side, 12px apart (stacks on narrow screens). */
function FieldRow({ children }) {
  return <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">{children}</div>
}

export default CreateTicket
