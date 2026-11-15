import { useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageSection } from '@/components/layout/PageSection'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Field, TextInput, Select } from '@/components/ui/Field'
import { NotificationPreferences } from '@/components/data/NotificationPreferences'
import { AccountSettings } from '@/components/data/AccountSettings'
import { ActionList, actionButtonClass as actionClass } from '@/components/data/ActionList'
import { navigation } from '@/data/navigation'
import { headerActions } from '@/data/dashboard'
import { accountTabs, profile, countries, security } from '@/data/account'
import checkSuccess from '@/assets/icons/check-success.svg'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s-]{7,}$/

function validate(values) {
  const errors = {}
  if (!values.firstName.trim()) errors.firstName = 'First name is required.'
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (values.phone.trim() && !PHONE_RE.test(values.phone.trim())) errors.phone = 'Enter a valid phone number.'
  return errors
}

/** Sections fade/rise in on mount, 50ms apart (see `.enter-rise` in components.css). */
const enter = (index) => ({ '--enter-index': index })

/** Account — Figma "Overview" (node 227:22275) and "Notifications" (node 227:25519) and "Settings" (node 227:22273). */
export function Account() {
  const [tab, setTab] = useState('overview')
  const [saved, setSaved] = useState(profile)

  return (
    <DashboardLayout
      brand="Eventify"
      navigation={navigation}
      activeId="account"
      title="Account"
      actions={headerActions}
    >
      <h1 className="sr-only">Account</h1>

      {/* Profile Info — 28 top / 20 bottom, 86px avatar, 20px gap */}
      <section aria-label="Profile" className="enter-rise flex items-center gap-5 px-4 pt-7 pb-5 md:px-8" style={enter(0)}>
        <img
          src={saved.avatar}
          alt={`${saved.firstName} ${saved.lastName}`}
          className="size-21.5 shrink-0 rounded-full bg-surface-muted object-cover"
        />
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-h3 tracking-normal text-fg">{saved.firstName} {saved.lastName}</p>
            <p className="truncate text-body-lg text-fg-soft">{saved.email}</p>
          </div>
          {saved.verified && (
            <Badge tone="success" className="h-7 gap-0">
              <Icon src={checkSuccess} className="size-5 dark:invert-0" />
              Verified
            </Badge>
          )}
        </div>
      </section>

      {/* Tab Container — 32px left inset, 28px between tabs */}
      <div className="enter-rise border-b border-default px-4 md:px-8" style={enter(1)}>
        <Tabs tabs={accountTabs} value={tab} onChange={setTab} idPrefix="account" label="Account sections" variant="compact" />
      </div>

      <div role="tabpanel" id={`account-panel-${tab}`} aria-labelledby={`account-tab-${tab}`}>
        {tab === 'overview' ? (
          <>
            <ProfileForm initial={saved} onSaved={setSaved} style={enter(2)} />
            <SecuritySection style={enter(3)} />
          </>
        ) : tab === 'notifications' ? (
          <NotificationPreferences />
        ) : (
          <AccountSettings />
        )}
      </div>
    </DashboardLayout>
  )
}

function ProfileForm({ initial, onSaved, style }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | saved
  const timer = useRef()

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (key) => (event) => {
    const next = { ...values, [key]: event.target.value }
    setValues(next)
    if (errors[key]) setErrors(validate(next))
    if (status === 'saved') setStatus('idle')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      event.currentTarget.elements.namedItem(firstInvalid)?.focus()
      return
    }
    setStatus('saving')
    // Stand-in for the API call
    timer.current = setTimeout(() => {
      onSaved({ ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim() })
      setStatus('saved')
    }, 700)
  }

  return (
    <PageSection title="Profile Information" className="enter-rise pt-6 pb-8" style={style}>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col items-end gap-8 rounded-lg border border-default p-2.75"
      >
        <div className="grid w-full grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
          <Field label="First Name" error={errors.firstName}>
            {({ id, describedBy, invalid }) => (
              <TextInput id={id} name="firstName" autoComplete="given-name" placeholder="e.g. Alex" value={values.firstName} onChange={set('firstName')} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            {({ id, describedBy, invalid }) => (
              <TextInput id={id} name="lastName" autoComplete="family-name" placeholder="e.g. Cabral" value={values.lastName} onChange={set('lastName')} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Email Address" error={errors.email}>
            {({ id, describedBy, invalid }) => (
              <TextInput id={id} name="email" type="email" autoComplete="email" spellCheck={false} placeholder="name@company.com" value={values.email} onChange={set('email')} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            {({ id, describedBy, invalid }) => (
              <TextInput id={id} name="phone" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" value={values.phone} onChange={set('phone')} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Organizer">
            {({ id }) => <TextInput id={id} name="organizer" value={values.organizer} readOnly />}
          </Field>
          <Field label="Country">
            {({ id }) => (
              <Select id={id} name="country" autoComplete="country" placeholder="Select your country" options={countries} value={values.country} onChange={set('country')} />
            )}
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <p role="status" className="status-fade text-body text-success-fg" data-visible={status === 'saved' || undefined}>
            {status === 'saved' ? 'Changes saved' : ''}
          </p>
          {/* Figma "Save Changes": 44px glass button, 16/24 medium */}
          <Button type="submit" variant="glass" loading={status === 'saving'} className="h-11 text-body-lg font-medium">
            Save Changes
          </Button>
        </div>
      </form>
    </PageSection>
  )
}

function SecuritySection({ style }) {
  const [twoFactor, setTwoFactor] = useState(security.twoFactorEnabled)

  const rows = [
    {
      id: 'password',
      title: 'Change Password',
      description: security.passwordChanged,
      action: <Button className={actionClass}>Change Password</Button>,
    },
    {
      id: '2fa',
      title: 'Two-Factor Authentication',
      badge: twoFactor ? <Badge tone="success">Enabled</Badge> : null,
      description: 'Add an extra layer of security by requiring a code when you sign in',
      action: (
        <Button className={actionClass} aria-pressed={twoFactor} onClick={() => setTwoFactor((on) => !on)}>
          {twoFactor ? 'Disable 2FA' : 'Activate 2FA'}
        </Button>
      ),
    },
  ]

  return (
    <PageSection title="Security" className="enter-rise pb-8" style={style}>
      <ActionList rows={rows} />
    </PageSection>
  )
}

export default Account
