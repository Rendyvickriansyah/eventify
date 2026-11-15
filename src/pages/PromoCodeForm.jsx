import { useMemo, useRef, useState } from 'react'
import { WizardShell, WizardHeading, useWizardEffects } from '@/components/layout/Wizard'
import { Field, TextInput, DateInput, OptionalTag } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Switch } from '@/components/ui/Switch'
import { toast } from '@/components/ui/Toast'
import { getEventDetail } from '@/data/eventDetail'
import { usePromoCodes, ensureDemoPromoCodes, addPromoCode, updatePromoCode, typeLabel, CODE_RE } from '@/data/promoStore'

/*
 * Create / edit a promo code — no Figma frame for this step, so it follows the app's other
 * single-step create pages (WizardShell, like Setup New Add-ons): code (with Generate), type,
 * value, optional usage limit and dates, and whether it's live.
 * Routes: #/event/:id/promo/new · #/event/:id/promo/:codeId/edit
 */

const typeOptions = Object.entries(typeLabel).map(([value, label]) => ({ value, label }))
const digits = (v) => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
const money = (v) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1')
const generate = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

function validate(f, taken) {
  const e = {}
  const code = f.code.trim()
  if (!code) e.code = 'Enter the code buyers type at checkout, like “EARLY50”.'
  else if (!CODE_RE.test(code)) e.code = 'Use 3–20 letters, numbers, - or _ (no spaces).'
  else if (taken.has(code)) e.code = `${code} already exists for this event — pick another code.`
  const value = Number(f.value)
  if (!(f.value !== '' && value > 0)) e.value = f.type === 'percentage' ? 'Enter a percentage above 0.' : 'Enter an amount above 0.'
  else if (f.type === 'percentage' && value > 100) e.value = 'A percentage can’t be more than 100.'
  if (f.maxUsage !== '' && Number(f.maxUsage) < 1) e.maxUsage = 'Use at least 1, or leave it empty for unlimited.'
  else if (f.maxUsage !== '' && Number(f.maxUsage) < f.used) e.maxUsage = `It’s already been used ${f.used} times — the limit can’t be lower.`
  if (f.start && f.end && f.end < f.start) e.end = 'The end date can’t be before the start date.'
  return e
}

/** @param {{ eventId: string, codeId?: string | null }} props */
export function PromoCodeForm({ eventId, codeId = null }) {
  const event = useMemo(() => getEventDetail(eventId), [eventId])
  useState(() => ensureDemoPromoCodes(eventId))
  const codes = usePromoCodes(eventId)
  const editing = codeId ? codes.find((p) => p.id === codeId) ?? null : null
  const listHref = `#/event/${eventId}/promo`
  const backHref = editing ? `${listHref}/${editing.id}` : listHref
  const [form, setForm] = useState(() => (editing
    ? { code: editing.code, type: editing.type, value: String(editing.value), maxUsage: editing.maxUsage == null ? '' : String(editing.maxUsage), start: editing.start ?? '', end: editing.end ?? '', active: editing.active, used: editing.used }
    : { code: '', type: 'percentage', value: '', maxUsage: '', start: '', end: '', active: true, used: 0 }))
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const codeRef = useRef(null)
  const taken = useMemo(() => new Set(codes.filter((p) => p.id !== codeId).map((p) => p.code)), [codes, codeId])

  const dirty = editing
    ? form.code !== editing.code || form.type !== editing.type || Number(form.value) !== editing.value || form.active !== editing.active
      || (form.maxUsage === '' ? null : Number(form.maxUsage)) !== editing.maxUsage || (form.start || null) !== editing.start || (form.end || null) !== editing.end
    : Boolean(form.code || form.value || form.maxUsage || form.start || form.end)
  useWizardEffects({ step: 0, formRef, firstFieldRef: codeRef, attempt, dirty: dirty && !saving })

  if (!event) return null
  if (codeId && !editing) {
    window.location.replace(listHref)
    return null
  }

  const setValue = (key, value) => {
    const next = { ...form, [key]: value }
    setForm(next)
    if (Object.keys(errors).length) {
      const fresh = validate(next, taken)
      setErrors((err) => Object.fromEntries(Object.keys(err).filter((k) => fresh[k]).map((k) => [k, fresh[k]])))
    }
  }
  const bind = (key, transform = (v) => v) => ({ name: key, value: form[key], onChange: (e) => setValue(key, transform(e.target.value)) })
  const ids = ({ id, describedBy, invalid }) => ({ id, 'aria-describedby': describedBy, invalid })

  function close() {
    if (dirty && !window.confirm(editing ? 'Discard your changes to this promo code?' : 'Discard this promo code? What you entered will be lost.')) return
    window.location.hash = backHref
  }

  async function submit(e) {
    e.preventDefault()
    if (saving) return
    const next = validate(form, taken)
    setErrors(next)
    if (Object.keys(next).length) {
      setAttempt((n) => n + 1)
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600)) // no API yet
    const data = {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      maxUsage: form.maxUsage === '' ? null : Number(form.maxUsage),
      start: form.start || null,
      end: form.end || null,
      active: form.active,
    }
    try {
      if (editing) updatePromoCode(eventId, editing.id, data)
      else addPromoCode(eventId, { ...data, used: 0 })
    } catch {
      setSaving(false)
      toast.error('Couldn’t save the promo code', { description: 'Browser storage is full or unavailable.' })
      return
    }
    window.location.hash = backHref
    toast.success(editing ? 'Promo code updated' : 'Promo Code Created', {
      description: editing ? `${data.code} is saved.` : `Share ${data.code} — buyers enter it at checkout for ${data.type === 'percentage' ? `${data.value}%` : `$${data.value}`} off.`,
    })
  }

  return (
    <WizardShell
      title={editing ? 'Edit Promo Code' : 'Setup New Promo Code'}
      onClose={close}
      closeLabel={editing ? 'Close and return to the promo code' : 'Close and return to promo codes'}
      formId="promo-form"
      formRef={formRef}
      onSubmit={submit}
      note={event.title}
      submitLabel={editing ? 'Save Changes' : 'Create Promo Code'}
      busy={saving}
      busyLabel="Saving…"
    >
      <WizardHeading title={editing ? `Edit ${editing.code}` : 'Add New Promo Code'} description="Give buyers a code that takes money off their order at checkout." />
      <div className="flex flex-col gap-5">
        <Field label="Promo Code" error={errors.code} hint={errors.code ? undefined : 'Letters, numbers, - and _ · shown in capitals'} className="min-h-0">
          {(f) => (
            <TextInput
              ref={codeRef} {...ids(f)} {...bind('code', (v) => v.toUpperCase().replace(/\s+/g, ''))}
              placeholder="e.g. EARLY50" autoComplete="off" spellCheck={false} maxLength={20} className="uppercase" data-1p-ignore
              trailing={
                <button type="button" onClick={() => setValue('code', generate())} className="h-7 cursor-pointer rounded-md px-2.5 text-label-sm text-fg outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/30">
                  Generate
                </button>
              }
            />
          )}
        </Field>
        <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
          <Field label="Discount Type" className="min-h-0">
            {(f) => <SelectMenu {...ids(f)} name="type" value={form.type} onChange={(v) => setValue('type', v)} options={typeOptions} />}
          </Field>
          <Field label="Discount Value" error={errors.value} className="min-h-0">
            {(f) => (
              <TextInput
                {...ids(f)} {...bind('value', form.type === 'percentage' ? digits : money)}
                inputMode="decimal" placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 25'} autoComplete="off" className="tabular-nums"
                leading={<span className="text-body text-fg-muted">{form.type === 'percentage' ? '%' : '$'}</span>}
              />
            )}
          </Field>
        </div>
        <Field label="Max Usage" error={errors.maxUsage} hint={errors.maxUsage ? undefined : 'How many orders can use it. Leave empty for unlimited.'} aside={<OptionalTag />} className="min-h-0">
          {(f) => <TextInput {...ids(f)} {...bind('maxUsage', digits)} inputMode="numeric" placeholder="Unlimited" autoComplete="off" className="tabular-nums" />}
        </Field>
        <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
          <Field label="Start Date" aside={<OptionalTag />} className="min-h-0">
            {(f) => <DateInput {...ids(f)} {...bind('start')} placeholder="Anytime" />}
          </Field>
          <Field label="End Date" error={errors.end} aside={<OptionalTag />} className="min-h-0">
            {(f) => <DateInput {...ids(f)} {...bind('end')} min={form.start || undefined} placeholder="No end date" />}
          </Field>
        </div>
        <Switch
          checked={form.active}
          onChange={(v) => setValue('active', v)}
          label="Active"
          description="Buyers can use this code at checkout. Switch it off to pause the code without deleting it."
        />
      </div>
    </WizardShell>
  )
}

export default PromoCodeForm
