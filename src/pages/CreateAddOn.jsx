import { useRef, useState } from 'react'
import { Bus, Crown, Shirt, Sparkles, UtensilsCrossed } from 'lucide-react'
import { WizardShell, WizardHeading, useWizardEffects } from '@/components/layout/Wizard'
import { Field, TextInput, TextArea, OptionalTag, Counter } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { toast } from '@/components/ui/Toast'
import { getEventDetail } from '@/data/eventDetail'
import { addAddOn, addOnCategories } from '@/data/addonStore'
import dollarIcon from '@/assets/icons/dollar.svg'

/*
 * Setup New Add-ons — Figma "Step 1" (node 263:31589). Single step: 72px header (title +
 * bare close), the 650px form, footer with "Publish Add-ons". Publishing returns to the
 * Add-ons tab with a success toast (step 2), like the ticket and event flows.
 * Route: #/event/:id/tickets/addons/new. Same shell as the other create flows (WizardShell).
 */

const categoryIcons = {
  'Parking & Transport': Bus,
  'Food & Beverage': UtensilsCrossed,
  Merchandise: Shirt,
  'Hospitality & VIP': Crown,
  Experience: Sparkles,
}
const categoryOptions = addOnCategories.map((c) => ({ value: c, label: c, icon: categoryIcons[c] }))
const NAME_MAX = 60
const digits = (v) => v.replace(/[^0-9]/g, '')
const money = (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1')

function validate(f) {
  const e = {}
  const qty = Number(f.quantity)
  const min = Number(f.minPerOrder)
  const max = Number(f.maxPerOrder)
  if (!f.name.trim()) e.name = 'Give the add-on a name buyers will recognise, like “VIP Parking Pass”.'
  if (!f.category) e.category = 'Pick the category that fits this add-on.'
  if (!(f.quantity !== '' && qty >= 1)) e.quantity = 'Enter how many are available (at least 1).'
  if (!(f.price !== '' && Number(f.price) >= 0)) e.price = 'Enter a price. Use 0 if it’s included for free.'
  if (!(f.minPerOrder !== '' && min >= 1)) e.minPerOrder = 'At least 1 per order.'
  if (!(f.maxPerOrder !== '' && max >= 1)) e.maxPerOrder = 'At least 1 per order.'
  else if (min >= 1 && max < min) e.maxPerOrder = `Can't be lower than the minimum (${min}).`
  else if (qty >= 1 && max > qty) e.maxPerOrder = `Can't be more than the available quantity (${qty}).`
  return e
}

/** @param {{ eventId: string }} props */
export function CreateAddOn({ eventId }) {
  const event = getEventDetail(eventId)
  const listHref = `#/event/${eventId}/tickets/addons`
  const [form, setForm] = useState({ name: '', category: '', image: null, description: '', quantity: '', price: '', minPerOrder: '1', maxPerOrder: '5' })
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const nameRef = useRef(null)

  const dirty = Boolean(form.name || form.category || form.image || form.description || form.quantity || form.price)
  useWizardEffects({ step: 0, formRef, firstFieldRef: nameRef, attempt, dirty: dirty && !saving })

  if (!event) return null // App only routes here for known events

  // Errors appear on submit, then re-check on every change so they clear once fixed.
  const setValue = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (Object.keys(errors).length) {
      const fresh = validate(next)
      setErrors((err) => Object.fromEntries(Object.keys(err).filter((k) => fresh[k]).map((k) => [k, fresh[k]])))
    }
  }
  const bind = (key, transform = (v) => v) => ({ name: key, value: form[key], onChange: (e) => setValue(key, transform(e.target.value)) })
  const ids = ({ id, describedBy, invalid }) => ({ id, 'aria-describedby': describedBy, invalid })

  function close() {
    if (dirty && !window.confirm('Discard this add-on? What you entered will be lost.')) return
    window.location.hash = listHref
  }

  async function publish(e) {
    e.preventDefault()
    if (saving) return
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) {
      setAttempt((n) => n + 1)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600)) // no API yet
    const name = form.name.trim()
    try {
      addAddOn(eventId, {
        name,
        category: form.category,
        image: form.image?.src ?? null,
        description: form.description.trim(),
        stock: Number(form.quantity),
        price: Number(form.price),
        minPerOrder: Number(form.minPerOrder),
        maxPerOrder: Number(form.maxPerOrder),
      })
    } catch {
      setSaving(false)
      toast.error('Could not save the add-on', { description: 'Browser storage is full or unavailable. Try a smaller image, or free up space.' })
      return
    }
    window.location.hash = listHref
    toast.success('Add-On Published Successfully', { description: `“${name}” is now available as an extra at checkout.` })
  }

  return (
    <WizardShell
      title="Setup New Add-ons"
      onClose={close}
      closeLabel="Close and return to add-ons"
      formId="create-addon"
      formRef={formRef}
      onSubmit={publish}
      note={event.title}
      submitLabel="Publish Add-ons"
      busy={saving}
      busyLabel="Publishing…"
    >
      <WizardHeading title="Add New Add-On" description="Enhance your attendees' experience by offering extra items or services alongside their ticket" />
      <div className="flex flex-col gap-5">
        <Field label="Add-on Name" error={errors.name} className="min-h-0" aside={<Counter value={form.name.length} max={NAME_MAX} showFrom={NAME_MAX - 15} />}>
          {(f) => <TextInput ref={nameRef} {...ids(f)} {...bind('name')} placeholder="e.g. VIP Parking Pass" autoComplete="off" maxLength={NAME_MAX} data-1p-ignore />}
        </Field>
        <Field label="Category" error={errors.category} className="min-h-0">
          {(f) => <SelectMenu {...ids(f)} name="category" value={form.category} onChange={(v) => setValue('category', v)} placeholder="Select here" options={categoryOptions} />}
        </Field>
        <ImageUpload label="Add Image" optional selectButton value={form.image} onChange={(image) => setForm((f) => ({ ...f, image }))} />
        <Field label="Description" className="min-h-0" aside={<OptionalTag />}>
          {(f) => <TextArea {...ids(f)} {...bind('description')} placeholder="What's included? e.g. Reserved spot in Lot A, valid all day, re-entry allowed" maxLength={300} />}
        </Field>
        <Field label="Available Quantity" error={errors.quantity} className="min-h-0">
          {(f) => <TextInput {...ids(f)} {...bind('quantity', digits)} inputMode="numeric" placeholder="e.g. 200" autoComplete="off" className="tabular-nums" />}
        </Field>
        <Field label="Price" error={errors.price} hint={errors.price ? undefined : 'Price per add-on in USD. Enter 0 if it’s included for free.'} className="min-h-0">
          {(f) => <TextInput {...ids(f)} {...bind('price', money)} inputMode="decimal" placeholder="0.00" autoComplete="off" className="tabular-nums" leading={<Icon src={dollarIcon} />} />}
        </Field>
        <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
          <Field label="Min Qty Per Order" error={errors.minPerOrder} className="min-h-0">
            {(f) => <TextInput {...ids(f)} {...bind('minPerOrder', digits)} inputMode="numeric" placeholder="e.g. 1" autoComplete="off" className="tabular-nums" />}
          </Field>
          <Field label="Max Qty Per Order" error={errors.maxPerOrder} className="min-h-0">
            {(f) => <TextInput {...ids(f)} {...bind('maxPerOrder', digits)} inputMode="numeric" placeholder="e.g. 5" autoComplete="off" className="tabular-nums" />}
          </Field>
        </div>
      </div>
    </WizardShell>
  )
}

export default CreateAddOn
