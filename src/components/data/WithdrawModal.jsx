import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Field, TextInput } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { CardBrandMini } from './CardBrandLogo'
import dollarIcon from '@/assets/icons/dollar.svg'
import questionIcon from '@/assets/icons/question-mark.svg'
import questionIconLg from '@/assets/icons/question-mark-lg.svg'
import checkIcon from '@/assets/icons/check-white.svg'

/*
 * Withdraw earnings — Figma "Popup Modal" (node 208:15551) and its success state (208:15605).
 * Form: amount (with $ prefix, min $100, max = balance), payout account, live payout details
 * (total, fee, net) and a full-width "Payout $…" button. Success: illustration, summary table,
 * Close. Payout fee = 7.5% (Figma: $37,500 on $500,000).
 */

export const PAYOUT_FEE_RATE = 0.075
export const MIN_PAYOUT = 100

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 })
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const parseAmount = (text) => {
  const n = Number(String(text).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const round2 = (n) => Math.round(n * 100) / 100

/**
 * @param {{
 *   open: boolean, onClose: () => void,
 *   balance: number,
 *   accounts: { id: string, brand: 'visa' | 'mastercard', number: string, isDefault?: boolean }[],
 *   initialAmount?: number,           // e.g. the whole balance for "Withdraw All"
 *   onWithdraw: (payout: { amount: number, fee: number, net: number, accountId: string }) => void,
 * }} props
 */
export function WithdrawModal({ open, onClose, balance, accounts, initialAmount, onWithdraw }) {
  const [step, setStep] = useState('form')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const amountRef = useRef(null)

  // Reset every time the modal opens.
  useEffect(() => {
    if (!open) return
    setStep('form')
    setAmount(initialAmount ? grouped.format(initialAmount) : '')
    setAccountId((accounts.find((a) => a.isDefault) ?? accounts[0])?.id ?? '')
    setError('')
    setSubmitting(false)
    setReceipt(null)
  }, [open, initialAmount, accounts])

  const value = parseAmount(amount)
  const fee = round2(value * PAYOUT_FEE_RATE)
  const net = round2(value - fee)
  const account = accounts.find((a) => a.id === accountId)

  function validate(n) {
    if (!n) return 'Enter how much you want to withdraw.'
    if (n < MIN_PAYOUT) return `The minimum payout is ${money.format(MIN_PAYOUT)}.`
    if (n > balance) return `You can withdraw up to ${money.format(balance)}.`
    return ''
  }

  function onAmountChange(e) {
    // Digits and one decimal point, max 2 decimals.
    const cleaned = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/, '$1')
    setAmount(cleaned)
    if (error) setError(validate(parseAmount(cleaned)))
  }

  async function submit(e) {
    e.preventDefault()
    if (submitting) return
    const problem = validate(value)
    setError(problem)
    if (problem) return amountRef.current?.focus()
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 900)) // no payout API yet
    const payout = { amount: value, fee, net, accountId }
    onWithdraw(payout)
    setReceipt({ ...payout, account })
    setSubmitting(false)
    setStep('success')
  }

  const success = step === 'success' && receipt

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={success ? undefined : 'Withdraw'}
      label="Payout sent"
      footer={
        success ? (
          <Button variant="glass" onClick={onClose} className="h-11 flex-1 text-body-lg font-medium">Close</Button>
        ) : (
          <Button type="submit" form="withdraw-form" variant="glass" disabled={submitting} aria-busy={submitting || undefined} className="h-11 flex-1 text-body-lg font-medium">
            {submitting ? (
              <span className="flex items-center gap-2"><Loader2 aria-hidden className="size-4 animate-spin" />Processing payout…</span>
            ) : value >= MIN_PAYOUT ? `Payout ${usd.format(net)}` : 'Payout'}
          </Button>
        )
      }
    >
      {success ? (
        <SuccessView receipt={receipt} />
      ) : (
        <form id="withdraw-form" noValidate onSubmit={submit} className="step-in flex flex-col gap-5 pb-6">
          <Field label="Amount to payout" hint={`Minimum payout amount is ${money.format(MIN_PAYOUT)} · Available ${money.format(balance)}`} error={error} className="min-h-0">
            {({ id, describedBy, invalid }) => (
              <TextInput
                ref={amountRef}
                id={id}
                name="amount"
                data-autofocus
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="0.00"
                value={amount}
                onChange={onAmountChange}
                onBlur={() => { if (amount) setAmount(grouped.format(parseAmount(amount))) }}
                onFocus={() => setAmount((a) => a.replace(/,/g, ''))}
                aria-describedby={describedBy}
                invalid={invalid}
                disabled={submitting}
                className="tabular-nums"
                leading={<Icon src={dollarIcon} />}
                trailing={
                  <button
                    type="button"
                    onClick={() => { setAmount(grouped.format(balance)); setError(''); amountRef.current?.focus() }}
                    disabled={submitting}
                    className="h-7 cursor-pointer rounded-sm px-2 text-label-sm text-fg-muted outline-none transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    Use max
                  </button>
                }
              />
            )}
          </Field>

          <Field label="Send payout to" className="min-h-0">
            {({ id }) => (
              <SelectMenu
                id={id}
                name="account"
                value={accountId}
                onChange={setAccountId}
                placeholder="Choose a payout account"
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.brand === 'visa' ? 'Visa' : 'Mastercard'} ${a.number}`,
                  icon: () => (
                    <span className="block h-4 w-5.5 shrink-0">
                      <CardBrandMini brand={a.brand} className="origin-top-left scale-[0.6875]" />
                    </span>
                  ),
                }))}
              />
            )}
          </Field>

          <section aria-labelledby="payout-details" className="flex flex-col gap-3 pt-5">
            <h3 id="payout-details" className="text-label text-fg">Payout details</h3>
            <dl className="flex flex-col gap-4 text-body">
              <Row term="Total payout" value={usd.format(value)} />
              <Row term={<FeeTerm size="sm" />} value={usd.format(fee)} />
              <Row term="You'll receive" value={usd.format(net)} strong />
            </dl>
          </section>
        </form>
      )}
    </Modal>
  )
}

function Row({ term, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-fg-soft">{term}</dt>
      <dd className={cn('text-right font-medium text-fg tabular-nums', strong && 'font-semibold')}>{value}</dd>
    </div>
  )
}

/** "Payout fee ?" — the help glyph explains the rate on hover and to screen readers. */
function FeeTerm({ size }) {
  const text = `${PAYOUT_FEE_RATE * 100}% of the payout amount, deducted before it's sent.`
  return (
    <span className="flex items-center gap-1.5" title={text}>
      Payout Fee
      <Icon src={size === 'lg' ? questionIconLg : questionIcon} className={size === 'lg' ? 'size-3.5' : 'size-3'} />
      <span className="sr-only">({text})</span>
    </span>
  )
}

/** Figma "Success Payout": 200px illustration, centred heading, 4-row summary table. */
function SuccessView({ receipt }) {
  const brand = receipt.account?.brand ?? 'visa'
  return (
    <div className="flex flex-col items-center gap-8 pb-1">
      <Illustration />
      <hgroup className="success-copy flex flex-col items-center gap-1 text-center">
        <h2 className="text-h3 tracking-normal text-fg">Your Payout is On Its Way</h2>
        <p className="text-body-lg text-pretty text-fg-muted">
          We're processing your payout. You'll receive a confirmation email at the address linked to your account.
        </p>
      </hgroup>
      <dl className="success-copy w-full text-body-lg text-fg">
        <SummaryRow term="Send Payout to" top>
          <span className="flex items-center gap-2.75 font-medium">
            <CardBrandMini brand={brand} />
            {receipt.account?.number}
          </span>
        </SummaryRow>
        <SummaryRow term="Withdrawal Amount">{usd.format(receipt.amount)}</SummaryRow>
        <SummaryRow term={<FeeTerm size="lg" />}>{usd.format(receipt.fee)}</SummaryRow>
        <SummaryRow term="Total Amount" strong last>{usd.format(receipt.net)}</SummaryRow>
      </dl>
    </div>
  )
}

function SummaryRow({ term, children, strong = false, top = false, last = false }) {
  return (
    <div className={cn('flex items-center border-default', top && 'border-t', !last && 'border-b')}>
      <dt className={cn('w-56 shrink-0 py-5 pr-3', strong && 'font-medium')}>{term}</dt>
      <dd className={cn('min-w-0 flex-1 py-5 pr-3 tabular-nums', strong && 'font-medium')}>{children}</dd>
    </div>
  )
}

/**
 * Figma "Illustration": a receipt card (white, 1.5px black/10 border, radius 16, layered
 * shadow) with six skeleton bars, cropped by the 200px frame, and a 44px green check badge.
 * Motion: card rises in, bars fill in 40ms apart, then the badge pops (rare moment → delight).
 */
function Illustration() {
  const bars = ['w-full', 'w-full', 'w-[110px]', 'w-full', 'w-full', 'w-[110px]']
  return (
    <div aria-hidden className="relative h-50 w-full overflow-hidden rounded-lg">
      <div className="absolute -bottom-10.5 left-[calc(50%+0.5px)] h-52.75 w-70.25 -translate-x-1/2">
        <div className="success-card absolute top-4 left-[calc(50%-7.5px)] flex h-48.75 w-66.5 -translate-x-1/2 flex-col gap-2.5 rounded-2xl border-[1.5px] border-black/10 bg-white p-4 shadow-[0_37.6px_25px_rgb(10_13_18/0.08),0_12.5px_9.4px_rgb(10_13_18/0.03),0_6.3px_3.1px_rgb(10_13_18/0.04)] dark:border-default dark:bg-surface">
          {[0, 1].map((group) => (
            <div key={group} className="flex flex-col gap-[9.573px]">
              {bars.slice(group * 3, group * 3 + 3).map((width, i) => (
                <span
                  key={i}
                  className={cn('success-bar block h-[19.146px] rounded-[4.787px] border border-black/10 bg-neutral-100 dark:border-default dark:bg-surface-muted', width)}
                  style={{ '--bar-index': group * 3 + i }}
                />
              ))}
            </div>
          ))}
        </div>
        <span className="success-badge absolute top-0 left-[calc(50%+118.5px)] flex size-11 -translate-x-1/2 items-center justify-center rounded-full border-2 border-green-950 bg-green-600">
          <img src={checkIcon} alt="" width="24" height="24" className="size-6" />
        </span>
      </div>
    </div>
  )
}

export default WithdrawModal
