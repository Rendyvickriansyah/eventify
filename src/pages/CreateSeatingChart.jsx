import { useRef, useState } from 'react'
import { WizardShell, useWizardEffects } from '@/components/layout/Wizard'
import { Field, TextInput, TextArea } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { toast } from '@/components/ui/Toast'
import { getEventDetail } from '@/data/eventDetail'
import { addSeatingChart, venueTypes } from '@/data/seating'

/*
 * Setup New Seating — Figma "Create Seating Chart" (node 147:10610).
 * Route: #/event/:id/seating/new. 72px header ("Assign Seating" + round close), a 600px
 * column (20/28 title, 16/24 description at 70%, 32px gap, fields 20px apart) and a footer
 * with "Draw Venue". Saving opens the new chart in the Seating editor with a toast.
 */

const typeOptions = venueTypes.map((t) => ({ value: t, label: t }))
const NAME_MAX = 80
const digits = (v) => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')

function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Enter the venue name, like “Jakarta Arena Stadium”.'
  if (!f.type) e.type = 'Pick the type of venue.'
  if (!f.address.trim()) e.address = 'Enter the venue address so attendees can find it.'
  if (!(f.capacity !== '' && Number(f.capacity) >= 1)) e.capacity = 'Enter how many people the venue holds (at least 1).'
  return e
}

/** @param {{ eventId: string }} props */
export function CreateSeatingChart({ eventId }) {
  const event = getEventDetail(eventId)
  const listHref = `#/event/${eventId}/seating`
  const [form, setForm] = useState({ name: '', type: '', description: '', address: '', capacity: '' })
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const nameRef = useRef(null)

  const dirty = Object.values(form).some(Boolean)
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
    if (dirty && !window.confirm('Discard this seating chart? What you entered will be lost.')) return
    window.location.hash = listHref
  }

  async function submit(e) {
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
    let chart
    try {
      chart = addSeatingChart(eventId, {
        name,
        venueType: form.type,
        description: form.description.trim(),
        address: form.address.trim(),
        capacity: Number(form.capacity),
        status: 'draft',
      })
    } catch {
      setSaving(false)
      toast.error('Could not save the seating chart', { description: 'Browser storage is full or unavailable. Free up space and try again.' })
      return
    }
    // "Draw Venue" → straight into the editor
    window.location.hash = `${listHref}/${chart.id}`
    toast.success('Seating Chart Created', { description: `Now draw the sections of “${name}” and assign them to ticket tiers.` })
  }

  return (
    <WizardShell
      title="Assign Seating"
      closeVariant="round"
      onClose={close}
      closeLabel="Close and return to seating charts"
      formId="create-seating"
      formRef={formRef}
      onSubmit={submit}
      note={event.title}
      submitLabel="Draw Venue"
      busy={saving}
      busyLabel="Saving…"
    >
      {/* Figma content column is 600px, inside the shell's 650px step column */}
      <div className="mx-auto flex w-full max-w-150 flex-col gap-8">
        <hgroup className="flex flex-col gap-1">
          <h1 className="text-h3 tracking-normal text-balance text-fg">Setup New Seating</h1>
          <p className="text-body-lg text-pretty text-fg-muted">Enter your venue details to start building the seating layout</p>
        </hgroup>
        <div className="flex flex-col gap-5">
          <Field label="Venue Name" error={errors.name} className="min-h-0">
            {(f) => <TextInput ref={nameRef} {...ids(f)} {...bind('name')} placeholder="e.g. Jakarta Arena Stadium" autoComplete="off" maxLength={NAME_MAX} data-1p-ignore />}
          </Field>
          <Field label="Venue Type" error={errors.type} className="min-h-0">
            {(f) => <SelectMenu {...ids(f)} name="type" value={form.type} onChange={(v) => setValue('type', v)} placeholder="Select venue type" options={typeOptions} />}
          </Field>
          <Field label="Venue Description" className="min-h-0">
            {(f) => <TextArea {...ids(f)} {...bind('description')} placeholder="Describe the venue — location, facilities, what the view is like from the seats" maxLength={500} className="h-26" />}
          </Field>
          <Field label="Venue Address" error={errors.address} className="min-h-0">
            {(f) => <TextInput {...ids(f)} {...bind('address')} placeholder="e.g. Jl. Arena Raya No. 1, Kelapa Gading, Jakarta Utara" autoComplete="street-address" />}
          </Field>
          <Field label="Capacity" error={errors.capacity} className="min-h-0">
            {(f) => <TextInput {...ids(f)} {...bind('capacity', digits)} inputMode="numeric" placeholder="e.g. 20000" autoComplete="off" maxLength={7} className="tabular-nums" />}
          </Field>
        </div>
      </div>
    </WizardShell>
  )
}

export default CreateSeatingChart
