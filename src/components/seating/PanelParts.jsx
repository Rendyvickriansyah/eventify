import { useEffect, useId, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { TextInput } from '@/components/ui/Field'

/* Building blocks for the seating editor's right sidebar (Figma "Right Sidebar"). */

const HEX = /^#([0-9a-f]{6})$/i

/** Sidebar group — 20/24px sides, 24px vertical, 12/16 muted title, 12px gap. */
export function Panel({ title, actions, className, children }) {
  return (
    <section className={cn('flex flex-col gap-3 py-6 pr-6 pl-5', className)}>
      {actions ? (
        <div className="-my-1.5 flex items-center justify-between gap-2">
          <h2 className="text-caption text-fg-muted">{title}</h2>
          <div className="-mr-1.5 flex items-center gap-0.5">{actions}</div>
        </div>
      ) : (
        <h2 className="text-caption text-fg-muted">{title}</h2>
      )}
      {children}
    </section>
  )
}

/** Label + control (+ hint / error). `children(id, describedBy)` renders the control. */
export function SideField({ label, hint, error, children }) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error || hint
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label-sm text-fg">{label}</label>
      {children(id, message ? messageId : undefined)}
      {message && (
        <p key={error ? 'e' : 'h'} id={messageId} className={cn('field-message flex items-start gap-1.5 text-body', error ? 'text-danger-fg' : 'text-fg-muted')}>
          {error && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />}
          <span>{message}</span>
        </p>
      )}
    </div>
  )
}

/**
 * Figma "Background": hex text + 16px swatch. Typing commits once it's a full #RRGGBB;
 * the swatch opens the native colour picker.
 */
export function ColorField({ label, value, onChange }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const valid = HEX.test(text)
  return (
    <SideField label={label}>
      {(id) => (
        <TextInput
          id={id}
          value={text}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          invalid={!valid}
          className="uppercase tabular-nums"
          onChange={(e) => {
            const next = `#${e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6)}`
            setText(next)
            if (HEX.test(next)) onChange(next.toUpperCase())
          }}
          onBlur={() => { if (!valid) setText(value) }}
          trailing={
            <label className="relative mr-1.5 block size-4 cursor-pointer overflow-hidden rounded-xs border border-black/10" style={{ backgroundColor: value }}>
              <span className="sr-only">Pick {label.toLowerCase()} colour</span>
              <input type="color" value={value.toLowerCase()} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" />
            </label>
          }
        />
      )}
    </SideField>
  )
}

/** Figma "Tabs" segmented control: neutral-100 track, 4px inset, white selected pill. */
export function Segmented({ value, options, onChange, label }) {
  const refs = useRef([])
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-neutral-100 p-1 dark:bg-surface-muted">
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            title={o.iconOnly ? o.label : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
              if (!step) return
              e.preventDefault()
              const next = (i + step + options.length) % options.length
              onChange(options[next].value)
              refs.current[next]?.focus()
            }}
            className={cn(
              'segment flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-body text-fg outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
              selected ? 'bg-surface font-medium shadow-xs' : 'hover:text-fg-soft',
            )}
          >
            {o.icon && <o.icon aria-hidden className="size-3.5" />}
            {o.iconOnly ? <span className="sr-only">{o.label}</span> : o.label}
          </button>
        )
      })}
    </div>
  )
}
