import { useEffect, useRef, useState } from 'react'
import { PageSection } from '@/components/layout/PageSection'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toast'
import { ActionList, actionButtonClass } from '@/components/data/ActionList'
import { createLocalStore } from '@/lib/localStore'
import { languages, timezones, currencies, defaultRegionalSettings, profile } from '@/data/account'

const regionalStore = createLocalStore('eventify:regional', defaultRegionalSettings, (v) => typeof v === 'object' && !Array.isArray(v))
const enter = (index) => ({ '--enter-index': index })

/**
 * Account › Settings — Figma node 227:22273: "Language & Region" (three selects in a 12px
 * bordered card, Save Changes bottom-right) and "Danger Zone" (red-bordered action list).
 * Both destructive actions ask for confirmation first; deleting also needs "DELETE" typed.
 */
export function AccountSettings() {
  return (
    <>
      <RegionalSettings />
      <DangerZone />
    </>
  )
}

const fields = [
  { key: 'language', label: 'Language', options: languages },
  { key: 'timezone', label: 'Timezone', options: timezones },
  { key: 'currency', label: 'Currency', options: currencies },
]

function RegionalSettings() {
  const [saved, setSaved] = useState(() => ({ ...defaultRegionalSettings, ...regionalStore.read() }))
  const [values, setValues] = useState(saved)
  const [saving, setSaving] = useState(false)
  const timer = useRef()

  useEffect(() => () => clearTimeout(timer.current), [])

  const dirty = fields.some(({ key }) => values[key] !== saved[key])

  function handleSubmit(e) {
    e.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    // Stand-in for the API call
    timer.current = setTimeout(() => {
      regionalStore.write(values)
      setSaved(values)
      setSaving(false)
      toast.success('Language & region updated', { description: 'Dates, times and amounts now use your new settings.' })
    }, 600)
  }

  return (
    <PageSection title="Language & Region" className="enter-rise pt-6 pb-8" style={enter(2)}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col items-end gap-8 rounded-lg border border-default p-3">
        <div className="flex w-full flex-col gap-5">
          {fields.map(({ key, label, options }) => (
            // Figma "Input Fields" are 96px tall (room for a hint), hence min-h-24
            <Field key={key} label={label} className="min-h-24">
              {({ id, describedBy }) => (
                <SelectMenu
                  id={id}
                  name={key}
                  value={values[key]}
                  onChange={(value) => setValues((prev) => ({ ...prev, [key]: value }))}
                  options={options}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          ))}
        </div>
        <Button type="submit" variant="glass" loading={saving} disabled={!dirty && !saving} className="h-11 text-body-lg font-medium">
          Save Changes
        </Button>
      </form>
    </PageSection>
  )
}

function DangerZone() {
  const [confirming, setConfirming] = useState(null) // 'deactivate' | 'delete' | null

  const rows = [
    {
      id: 'deactivate',
      title: 'Deactivate Account',
      description: 'Temporarily disable your account. You can reactivate it anytime by logging back in. Your events and data will be preserved.',
      action: <Button className={actionButtonClass} onClick={() => setConfirming('deactivate')}>Deactivate Account</Button>,
    },
    {
      id: 'delete',
      title: 'Delete Account',
      description: 'Permanently delete your account and all associated data. This action cannot be undone and all your events, orders, and payout history will be removed.',
      action: <Button className={actionButtonClass} onClick={() => setConfirming('delete')}>Delete Account</Button>,
    },
  ]

  return (
    <PageSection title="Danger Zone" className="enter-rise pb-8" style={enter(3)}>
      <ActionList rows={rows} tone="danger" />
      <ConfirmDeactivate open={confirming === 'deactivate'} onClose={() => setConfirming(null)} />
      <ConfirmDelete open={confirming === 'delete'} onClose={() => setConfirming(null)} />
    </PageSection>
  )
}

function useStandIn(onDone) {
  const [busy, setBusy] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  const run = () => {
    setBusy(true)
    timer.current = setTimeout(() => {
      setBusy(false)
      onDone()
    }, 700)
  }
  return [busy, run]
}

function ConfirmDeactivate({ open, onClose }) {
  const [busy, run] = useStandIn(() => {
    onClose()
    toast.success('Account deactivated', { description: 'Sign back in anytime to reactivate it — your events and data are kept.' })
  })

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Deactivate your account?"
      footer={
        <>
          <Button className="h-11 flex-1 text-body-lg font-medium" onClick={onClose} disabled={busy} data-autofocus>Cancel</Button>
          <Button variant="danger" className="h-11 flex-1 text-body-lg font-medium" loading={busy} onClick={run}>Deactivate Account</Button>
        </>
      }
    >
      <p className="pb-2 text-body text-pretty text-fg-muted">
        Your events will be hidden and ticket sales paused until you sign back in. Nothing is deleted.
      </p>
    </Modal>
  )
}

const DELETE_WORD = 'DELETE'

function ConfirmDelete({ open, onClose }) {
  const [typed, setTyped] = useState('')
  const [busy, run] = useStandIn(() => {
    close()
    toast.success('Account deletion requested', { description: `We’ve sent a confirmation link to ${profile.email}.` })
  })
  const matches = typed.trim() === DELETE_WORD

  function close() {
    onClose()
    setTyped('')
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : close}
      title="Delete your account?"
      footer={
        <>
          <Button className="h-11 flex-1 text-body-lg font-medium" onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" form="delete-account-form" variant="danger" className="h-11 flex-1 text-body-lg font-medium" loading={busy} disabled={!matches && !busy}>
            Delete Account
          </Button>
        </>
      }
    >
      <form
        id="delete-account-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (matches && !busy) run()
        }}
        className="flex flex-col gap-5 pb-2"
      >
        <p className="text-body text-pretty text-fg-muted">
          This permanently removes your account with all events, orders and payout history. It can’t be undone.
        </p>
        <Field label={<>Type <span className="font-semibold">{DELETE_WORD}</span> to confirm</>} className="min-h-0">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              name="confirm"
              data-autofocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={DELETE_WORD}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

export default AccountSettings
