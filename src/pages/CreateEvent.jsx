import { useRef, useState } from 'react'
import { Frame, Music, Presentation, Shirt, Trophy, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/cn'
import { WizardShell, WizardHeading, useWizardEffects } from '@/components/layout/Wizard'
import { Field, TextInput, TextArea, OptionalTag, Counter } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { SettingsGroups } from '@/components/ui/SettingToggle'
import { toast } from '@/components/ui/Toast'
import { eventCategories } from '@/data/events'
import { addEvent } from '@/data/eventStore'

/*
 * Create New Event — Figma "Step 1" (113:19103), "Step 2" (113:19539); on success it returns
 * to the Events list with the "Event Created Successfully" toast (Figma "Step 3", 274:36843).
 * Route: #/events/new. Full-screen: 72px header (title · stepper · close), 650px form column
 * with 56px vertical padding, footer with the primary action.
 *
 * Motion (all occasional — this flow runs once per event):
 *  - steps slide 12px in the direction of travel (forward from the right, Back from the left)
 *  - the stepper fills the dashed divider and swaps a finished number for a check
 *  - a failed submit shakes the invalid fields once (WAAPI, skipped for reduced motion)
 *  - the banner tile lifts on drag-over; the preview pops in from 0.98
 */

const steps = [
  { id: 'setup', label: 'Setup New Event' },
  { id: 'advanced', label: 'Advance Event Settings' },
  { id: 'publish', label: 'Publish' },
]

const categoryIcons = { 'Music & Art': Music, 'Sports & Fitness': Trophy, 'Food & Drink': UtensilsCrossed, Conference: Presentation, Exhibition: Frame, Fashion: Shirt }
const categoryOptions = eventCategories.map((c) => ({ value: c, label: c, icon: categoryIcons[c] }))
const NAME_MAX = 80
const DESCRIPTION_MAX = 1000

const advancedGroups = [
  {
    title: 'Access & Registration',
    items: [
      { key: 'manualApproval', heading: 'Require Registration Approval', hint: 'Manually review and approve each registration before confirming the ticket', label: 'Enable manual approval', description: 'Each registration will be reviewed before the ticket is confirmed and sent to the buyer' },
      { key: 'customForm', heading: 'Attendee Information Collection', hint: 'Collect additional details from buyers at checkout', label: 'Enable custom registration form', description: 'Add custom fields to gather extra information from attendees during purchase' },
      { key: 'multipleEntries', heading: 'Scheduling & Availability', hint: 'Automate when your event goes live and set a maximum attendee capacity', label: 'Enable multiple entries', description: 'The ticket can be scanned more than once, useful for multi-day or multi-session events' },
    ],
  },
  {
    title: 'Discoverability',
    items: [
      { key: 'hidden', heading: 'Search Visibility', hint: 'Control whether this event appears in search and discovery feeds', label: 'Hide from search and discovery', description: "Your event won't appear in search results or category listings. Only accessible via direct link" },
      { key: 'ageRestricted', heading: 'Age Restriction', hint: 'Restrict this event to attendees above a certain age', label: 'Enable event-level age restriction', description: 'Buyers must confirm they meet the minimum age requirement before purchasing' },
    ],
  },
]

const emptySettings = Object.fromEntries(advancedGroups.flatMap((g) => g.items.map((i) => [i.key, false])))


function validate(form) {
  const errors = {}
  if (!form.title.trim()) errors.title = 'Give your event a name so buyers can find it.'
  if (!form.category) errors.category = 'Pick the category that best fits your event.'
  return errors
}

export function CreateEvent() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [form, setForm] = useState({ title: '', category: '', description: '', banner: null })
  const [settings, setSettings] = useState(emptySettings)
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const nameRef = useRef(null)
  const headingRef = useRef(null)

  const enabledCount = Object.values(settings).filter(Boolean).length
  const dirty = Boolean(form.title || form.category || form.description || form.banner) || enabledCount > 0

  // "Reward early, punish late": errors appear on submit, then re-check on every change so
  // they clear the moment the field is fixed.
  const set = (key) => (e) => {
    const next = { ...form, [key]: e.target.value }
    setForm(next)
    if (errors[key]) setErrors((err) => ({ ...err, [key]: validate(next)[key] }))
  }

  useWizardEffects({ step, formRef, firstFieldRef: nameRef, headingRef, attempt, dirty: dirty && !saving })

  function go(next) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
  }

  function close() {
    if (dirty && !window.confirm('Discard this event? What you entered will be lost.')) return
    window.location.hash = '#/events'
  }

  function continueToAdvanced(e) {
    e.preventDefault()
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) {
      setAttempt((n) => n + 1)
      if (next.title) nameRef.current?.focus()
      else formRef.current?.querySelector('[role="combobox"]')?.focus()
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
    try {
      addEvent({ title: form.title.trim(), category: form.category, description: form.description.trim(), banner: form.banner?.src ?? null, settings })
    } catch {
      setSaving(false)
      go(1)
      toast.error('Could not save the event', { description: 'Browser storage is full or unavailable. Try again with a smaller banner image.' })
      return
    }
    window.location.hash = '#/events'
    toast.success('Event Created Successfully', {
      description: 'Your event is now live and ready to receive registrations. Start adding ticket types to begin selling.',
    })
  }

  return (
    <WizardShell
      title="Create New Event"
      steps={steps}
      current={step}
      direction={direction}
      onClose={close}
      closeLabel="Close and return to events"
      formId="create-event"
      formRef={formRef}
      onSubmit={step === 0 ? continueToAdvanced : create}
      note={
        step === 0 ? 'Step 1 of 3 · Basic details'
          : step === 1 ? (enabledCount ? `${enabledCount} of 5 options enabled · change them anytime in Settings` : 'All optional · change them anytime in Settings')
          : 'Publishing your event…'
      }
      onBack={step > 0 ? () => go(0) : undefined}
      submitLabel={step === 0 ? 'Continue' : 'Create Event'}
      busy={saving}
      busyLabel="Creating event…"
    >
        {step === 0 ? (
          <>
            <WizardHeading title="Create New Event" description="Fill in the details below to set up your event. You can always update this information later as your plans evolve." />

            <div className="flex flex-col gap-6">
              <Field
                label="Event Name"
                error={errors.title}
                className="min-h-0"
                aside={<Counter value={form.title.length} max={NAME_MAX} showFrom={NAME_MAX - 20} />}
              >
                {({ id, describedBy, invalid }) => (
                  <TextInput
                    ref={nameRef}
                    id={id}
                    name="title"
                    value={form.title}
                    onChange={set('title')}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="e.g. Jakarta Jazz Festival 2026"
                    autoComplete="off"
                    maxLength={NAME_MAX}
                    data-1p-ignore
                  />
                )}
              </Field>
              <Field label="Event Category" error={errors.category} className="min-h-0">
                {({ id, describedBy, invalid }) => (
                  <SelectMenu
                    id={id}
                    name="category"
                    value={form.category}
                    onChange={(category) => set('category')({ target: { value: category } })}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    placeholder="Choose the category that fits best"
                    options={categoryOptions}
                  />
                )}
              </Field>
              <Field
                label="Event Description"
                className="min-h-0"
                aside={
                  form.description.length > DESCRIPTION_MAX - 200
                    ? <Counter value={form.description.length} max={DESCRIPTION_MAX} showFrom={0} />
                    : <OptionalTag />
                }
              >
                {({ id }) => (
                  <TextArea
                    id={id}
                    name="description"
                    value={form.description}
                    onChange={set('description')}
                    placeholder="What should attendees know? Lineup, agenda highlights, what's included in the ticket…"
                    maxLength={DESCRIPTION_MAX}
                    rows={3}
                  />
                )}
              </Field>
              <ImageUpload label="Event banner" optional value={form.banner} onChange={(banner) => setForm((f) => ({ ...f, banner }))} />
            </div>
          </>
        ) : (
          <>
            <WizardHeading title="Advanced Settings" optional headingRef={headingRef} description="Optional configurations to fine-tune your event's access, visibility, and attendee experience" />

            <div className="flex flex-col gap-6">
              <SettingsGroups groups={advancedGroups} values={settings} onChange={(key, checked) => setSettings((s) => ({ ...s, [key]: checked }))} disabled={saving} />
            </div>
          </>
        )}
    </WizardShell>
  )
}

export default CreateEvent
