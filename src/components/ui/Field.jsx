import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import chevronDown from '@/assets/icons/chevron-down.svg'
import gripIcon from '@/assets/icons/textarea-grip.svg'
import { Icon } from './Icon'
import { DatePicker } from './DatePicker'

/*
 * Figma "Input Fields / _Input Base": label 14/20 medium, 8px gap, 40px control
 * (black/10 border, radius 8, 12 × 10 padding — 1px less here since Figma strokes sit inside).
 * The base is 96px tall in Figma; the spare space below the control holds the hint / error.
 *
 * States: default · hover (border-strong) · focus-visible (primary border + 4px ring) ·
 * invalid (danger border; message gets an icon so the error is not colour-only) · readonly.
 * Touch devices get 16px text so iOS Safari doesn't zoom the page on focus.
 */
const controlBase = cn(
  'w-full min-w-0 rounded-md border border-default bg-surface px-2.75 text-body text-fg outline-none',
  'transition-[border-color,box-shadow] duration-150 ease-out',
  'placeholder:text-fg-subtle hover:border-strong',
  'focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20',
  'aria-invalid:border-danger aria-invalid:hover:border-danger aria-invalid:focus-visible:ring-danger/20',
  'pointer-coarse:text-base',
  /* Figma "Organizer": gray-50 fill, 60% text. Attribute selector, not :read-only — every <select> matches :read-only. */
  '[&[readonly]]:bg-gray-50 [&[readonly]]:text-fg-soft [&[readonly]]:hover:border-default [&[readonly]]:focus-visible:border-default [&[readonly]]:focus-visible:ring-0',
  'dark:[&[readonly]]:bg-surface-muted',
)

/**
 * Labelled form control with reserved space for a hint or error message.
 * `children` is a render function receiving the ids to wire into the control.
 *
 * @param {{
 *   label: string,
 *   hint?: string,
 *   error?: string,
 *   aside?: React.ReactNode,   // right side of the label row, e.g. "Optional" or a character count
 *   className?: string,
 *   children: (ids: { id: string, describedBy?: string, invalid: boolean }) => React.ReactNode,
 * }} props
 */
export function Field({ label, hint, error, aside, className, children }) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error || hint
  return (
    <div className={cn('flex min-h-24 min-w-0 flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label text-fg">{label}</label>
        {aside}
      </div>
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message && (
        <p
          key={error ? 'error' : 'hint'}
          id={messageId}
          className={cn('field-message flex items-start gap-1.5 text-body', error ? 'text-danger-fg' : 'text-fg-muted')}
        >
          {error && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />}
          <span>{message}</span>
        </p>
      )}
    </div>
  )
}

/**
 * Text input. `leading` (e.g. a 16px icon) and `trailing` (e.g. a small action button) sit
 * on top of the input, inside its border, with padding reserved — so clicks on the padding
 * still land in the field.
 * @param {React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean,
 *          leading?: React.ReactNode, trailing?: React.ReactNode }} props
 */
export function TextInput({ invalid, leading, trailing, className, ...props }) {
  const input = (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-10', leading && 'pl-9', trailing && 'pr-24', className)}
      {...props}
    />
  )
  if (!leading && !trailing) return input
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute top-1/2 left-3 z-1 flex -translate-y-1/2">{leading}</span>}
      {input}
      {trailing && <span className="absolute top-1/2 right-1.5 z-1 flex -translate-y-1/2">{trailing}</span>}
    </div>
  )
}

/**
 * Date field — Figma "Sales Start Date" (calendar icon, input box) opening the glass
 * DatePicker panel. Pass `time` + `onTimeChange` to pick a time in the same panel.
 * @param {import('./DatePicker').DatePickerProps} props
 */
export function DateInput(props) {
  return <DatePicker {...props} />
}

/**
 * Time field — Figma "Start Time" (plain input, no icon). Clicking anywhere opens the native
 * time picker; the browser's clock glyph is hidden like the date field's calendar.
 * @param {React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }} props
 */
export function TimeInput({ className, ...props }) {
  return <TextInput type="time" className={cn(pickerOverlay, !props.value && 'text-fg-subtle', className)} {...props} />
}

/* Stretch the native picker indicator invisibly over the whole input, so any click opens it. */
const pickerOverlay = cn(
  'relative cursor-pointer disabled:cursor-default',
  '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
)

/** "Optional" marker for the right side of a field label row (`<Field aside>`). */
export function OptionalTag() {
  return <span className="text-caption text-fg-subtle">Optional</span>
}

/** Character count for `<Field aside>`: fades in from `showFrom`, turns red at `max`. */
export function Counter({ value, max, showFrom = 0 }) {
  const visible = value >= showFrom && value > 0
  return (
    <span
      aria-hidden={!visible}
      className={cn('status-fade text-caption tabular-nums', value >= max ? 'text-danger-fg' : 'text-fg-subtle')}
      data-visible={visible || undefined}
    >
      {value}/{max}
    </span>
  )
}

/**
 * Figma "Text Area": 90px, 12px padding, xs shadow, resize grip (Figma "Expanded Text Area")
 * drawn over the native one. Cmd/Ctrl+Enter submits the surrounding form.
 * @param {React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }} props
 */
export function TextArea({ invalid, className, onKeyDown, ...props }) {
  return (
    <div className="relative">
      <textarea
        aria-invalid={invalid || undefined}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (!e.defaultPrevented && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        className={cn(controlBase, 'block h-22.5 min-h-22.5 resize-y p-2.75 shadow-xs [&::-webkit-resizer]:bg-transparent', className)}
        {...props}
      />
      <Icon src={gripIcon} className="pointer-events-none absolute right-1.75 bottom-1.75" />
    </div>
  )
}

/**
 * Native select styled as the Figma input with a 16px chevron (Figma "Country").
 * `placeholder` adds a disabled empty first option and mutes the text until a value is picked.
 * @param {React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean, placeholder?: string,
 *          options: { value: string, label: string, disabled?: boolean }[] }} props
 */
export function Select({ invalid, options = [], placeholder, className, ...props }) {
  const empty = placeholder && !props.value
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(controlBase, 'h-10 cursor-pointer appearance-none pr-9', empty && 'text-fg-subtle', className)}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled} className="text-fg">{option.label}</option>
        ))}
      </select>
      <Icon src={chevronDown} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
    </div>
  )
}

export default Field
