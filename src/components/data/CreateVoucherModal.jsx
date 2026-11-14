import { useEffect, useState } from 'react'
import { Loader2, Ticket } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, OptionalTag } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { toast } from '@/components/ui/Toast'
import { addVoucher } from '@/data/voucherStore'

/*
 * Create e-voucher template — no Figma frame for this step yet, so it's a short modal built
 * from existing pieces (Modal, Field, TextInput, SelectMenu): name the template and optionally
 * attach it to a ticket type. The layout editor ("Manage e-voucher") comes with its design.
 */

/**
 * @param {{ open: boolean, onClose: () => void, eventId: string,
 *           ticketTypes: { id: string, name: string }[], onCreated?: (voucher: object) => void }} props
 */
export function CreateVoucherModal({ open, onClose, eventId, ticketTypes, onCreated }) {
  const [name, setName] = useState('')
  const [ticketTypeId, setTicketTypeId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setTicketTypeId('')
    setError('')
    setSaving(false)
  }, [open])

  async function submit(e) {
    e.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setError('Name the template so you can tell it apart, like “Match Day E-Voucher”.')
      e.currentTarget.querySelector('input[name=name]')?.focus()
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 500)) // no API yet
    let created
    try {
      created = addVoucher(eventId, { name: name.trim(), ticketTypeId: ticketTypeId || null })
    } catch {
      setSaving(false)
      toast.error('Could not save the template', { description: 'Browser storage is full or unavailable. Free up space and try again.' })
      return
    }
    onCreated?.(created)
    onClose()
    toast.success('E-Voucher Template Created', { description: `“${created.name}” is ready. Attach it to a ticket type so buyers receive it.` })
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Create E-Voucher"
      footer={
        <Button type="submit" form="voucher-form" variant="glass" disabled={saving} aria-busy={saving || undefined} className="h-11 flex-1 text-body-lg font-medium">
          {saving ? <span className="flex items-center gap-2"><Loader2 aria-hidden className="size-4 animate-spin" />Creating template…</span> : 'Create E-Voucher'}
        </Button>
      }
    >
      <form id="voucher-form" noValidate onSubmit={submit} className="flex flex-col gap-5 pb-2">
        <Field label="Template Name" error={error} className="min-h-0">
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              name="name"
              data-autofocus
              value={name}
              onChange={(e) => { setName(e.target.value); if (error && e.target.value.trim()) setError('') }}
              aria-describedby={describedBy}
              invalid={invalid}
              placeholder="e.g. Match Day E-Voucher"
              autoComplete="off"
              maxLength={60}
              data-1p-ignore
            />
          )}
        </Field>
        <Field label="Attach to Ticket Type" hint={ticketTypes.length ? 'Buyers of this ticket type receive this e-voucher.' : 'Create a ticket type first to attach this template to it.'} className="min-h-0" aside={<OptionalTag />}>
          {({ id, describedBy }) => (
            <SelectMenu
              id={id}
              name="ticketType"
              value={ticketTypeId}
              onChange={setTicketTypeId}
              aria-describedby={describedBy}
              placeholder={ticketTypes.length ? 'Choose a ticket type' : 'No ticket types yet'}
              options={ticketTypes.map((t) => ({ value: t.id, label: t.name, icon: Ticket }))}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

export default CreateVoucherModal
