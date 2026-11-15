import { useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import closeIcon from '@/assets/icons/close.svg'
import dividerIcon from '@/assets/icons/stepper-divider.svg'

/*
 * Full-screen multi-step form — Figma "Create New Event" (113:19103) and "Add New Ticket"
 * (93:11151) share it: 72px header (200px title · centred stepper · 200px close), a scrolling
 * 650px column with 56px vertical padding, and a footer with the actions on the right.
 *
 * Motion: steps slide 12px in the direction of travel (`.step-in[data-dir]`); the stepper
 * fills its divider and swaps a finished number for a check (`.step-*` in components.css).
 */

/**
 * @param {{
 *   title: string,                                   // header title, e.g. "Setup New Ticket"
 *   steps?: { id: string, label: string }[],          // omit for a single-step page (no stepper)
 *   current?: number,                                // index into steps
 *   direction?: 'forward' | 'back',
 *   onClose: () => void, closeLabel?: string,
 *   formId: string, formRef?: React.Ref<HTMLFormElement>, onSubmit: (e: React.FormEvent) => void,
 *   note?: React.ReactNode,                          // footer, left — context for this step
 *   onBack?: () => void,                             // shows "Back" when given
 *   submitLabel: string, busy?: boolean, busyLabel?: string,
 *   closeVariant?: 'round' | 'bare',                 // default: round with steps, bare without
 *   fullBleed?: boolean,                             // children fill the body (editors) instead of the 650px column
 *   children: React.ReactNode,                       // the current step's content
 * }} props
 */
export function WizardShell({
  title, steps, current = 0, direction = 'forward', onClose, closeLabel = 'Close',
  formId, formRef, onSubmit, note, onBack, submitLabel, busy = false, busyLabel = 'Saving…',
  closeVariant = steps ? 'round' : 'bare', fullBleed = false, children,
}) {
  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex h-18 shrink-0 items-center justify-between gap-4 border-b border-default px-4 md:px-8">
        <p className={cn('truncate text-body-lg font-medium text-fg', steps ? 'hidden w-50 lg:block' : 'min-w-0')}>{title}</p>
        {steps && <Stepper steps={steps} current={current} />}
        <div className={cn('flex justify-end', steps && 'lg:w-50')}>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn(
              'press flex cursor-pointer items-center justify-center outline-none transition-[background-color,border-color,transform] duration-150 ease-out focus-visible:ring-4 focus-visible:ring-primary/20',
              closeVariant === 'round'
                ? 'size-9 rounded-full border border-default bg-[#fcfdfd] shadow-xs hover:border-strong hover:bg-surface-muted dark:bg-surface'
                : /* Figma "Setup New Add-ons": bare 16px close icon */ '-mr-2 size-8 rounded-md hover:bg-surface-muted',
            )}
          >
            <Icon src={closeIcon} />
          </button>
        </div>
      </header>

      {fullBleed ? (
        <form ref={formRef} id={formId} noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col md:flex-row">
          {children}
        </form>
      ) : (
        <form ref={formRef} id={formId} noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-10 md:py-14">
          <div key={steps ? Math.min(current, steps.length - 2) : 0} data-dir={direction} className="step-in flex h-max w-full max-w-162.5 flex-col gap-8">
            {children}
          </div>
        </form>
      )}

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-default px-4 py-2 md:px-8">
        <p className="hidden text-body text-fg-muted sm:block" aria-live="polite">{note}</p>
        <div className="ml-auto flex items-center gap-2.5">
          {onBack && (
            <Button type="button" variant="secondary" onClick={onBack} disabled={busy} className="h-10 rounded-lg px-4">Back</Button>
          )}
          <Button type="submit" form={formId} variant="glass" disabled={busy} aria-busy={busy || undefined} className="min-w-37">
            {busy ? <span className="flex items-center gap-2"><Loader2 aria-hidden className="size-4 animate-spin" />{busyLabel}</span> : submitLabel}
          </Button>
        </div>
      </footer>
    </div>
  )
}

/**
 * Step heading — 20/28 semibold title (+ "(Optional)"), 16/24 description at 70%, divider below.
 * @param {{ title: string, description: string, optional?: boolean, headingRef?: React.Ref<HTMLHeadingElement> }} props
 */
export function WizardHeading({ title, description, optional = false, headingRef }) {
  return (
    <hgroup className="flex flex-col gap-1 border-b border-default pb-6">
      <div className="flex items-baseline gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-h3 tracking-normal text-balance text-fg outline-none">{title}</h1>
        {optional && <span className="text-body text-fg-muted">(Optional)</span>}
      </div>
      <p className="text-body-lg text-pretty text-fg-muted">{description}</p>
    </hgroup>
  )
}

/**
 * Figma header "Stepper": 28px circles (dark glass when reached, gray-200 ahead), 109px dashed
 * dividers. Finished steps swap their number for a check and fill the divider after them.
 * @param {{ steps: { id: string, label: string }[], current: number }} props
 */
export function Stepper({ steps, current }) {
  return (
    <ol aria-label="Progress" className="flex items-center justify-center">
      {steps.map((s, i) => {
        const state = i < current ? 'complete' : i === current ? 'current' : 'upcoming'
        return (
          <li key={s.id} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="relative mx-2 flex h-10 w-4 items-center md:mx-0 md:w-27.25">
                <img src={dividerIcon} alt="" width="109" height="40" className="hidden h-10 w-27.25 md:block dark:invert" />
                <span className="absolute inset-x-0 h-px bg-black/10 md:hidden dark:bg-white/10" />
                <span className="step-progress absolute inset-x-0 h-px bg-fg/40 md:inset-x-4" data-filled={i <= current || undefined} />
              </span>
            )}
            <span className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step-dot relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-caption font-semibold dark:bg-surface-muted" data-state={state}>
                <span aria-hidden className="step-dot-fill brand-mark absolute inset-0 overflow-hidden rounded-full border border-default p-px">
                  <span className="brand-mark-face block size-full rounded-full" />
                </span>
                <span aria-hidden className="step-num relative">{i + 1}</span>
                <Check aria-hidden className="step-check absolute size-3.5 text-white" strokeWidth={2.5} />
              </span>
              <span className={cn('text-body whitespace-nowrap text-fg', state !== 'upcoming' ? 'font-medium' : 'hidden sm:inline')}>
                {s.label}
                <span className="sr-only">{{ complete: ' (completed)', current: ' (current)', upcoming: '' }[state]}</span>
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const isTouch = () => window.matchMedia('(pointer: coarse)').matches
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Wizard behaviours shared by every flow:
 *  - on step change: scroll to top; focus the first field (step 0, not on touch) or the heading
 *  - after a failed submit (`attempt` bumps): shake each invalid field once
 *  - while there are unsaved changes: warn before the tab closes / reloads
 */
export function useWizardEffects({ step, formRef, firstFieldRef, headingRef, attempt, dirty }) {
  useEffect(() => {
    formRef.current?.scrollTo({ top: 0 })
    if (step === 0 && !isTouch()) firstFieldRef?.current?.focus()
    else if (step > 0) headingRef?.current?.focus({ preventScroll: true })
  }, [step, formRef, firstFieldRef, headingRef])

  useEffect(() => {
    if (!attempt || reducedMotion()) return
    formRef.current?.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
      el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }],
        { duration: 280, easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)' },
      )
    })
  }, [attempt, formRef])

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

export default WizardShell
