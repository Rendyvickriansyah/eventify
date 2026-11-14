import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * Switch — Figma "Switch" / "_Switch Base" (node 100:13080): 36 × 20 pill, #e5e5e5 off,
 * 16px #fcfdfd thumb with a 1/2px drop shadow; label 14/20 medium, description 14/20,
 * 12px gap. "On" (not drawn in Figma) fills the track with the foreground colour.
 * The whole row — switch, label and description — toggles (no dead zones).
 *
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, label: string,
 *           description?: string, name?: string, disabled?: boolean, className?: string }} props
 */
export function Switch({ checked, onChange, label, description, name, disabled = false, className }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        name={name}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-checked={checked || undefined}
        className={cn(
          'switch-track relative mt-px inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-black/5 shadow-[0_1px_2px_rgb(26_26_26/0.05)] outline-none',
          'focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-default',
          checked ? 'bg-fg' : 'bg-neutral-200 hover:bg-[#dcdcdc] dark:bg-surface-muted',
        )}
      >
        <span aria-hidden className="switch-thumb absolute left-px size-4 rounded-full bg-[#fcfdfd] shadow-[0_1px_2px_rgb(26_26_26/0.05)]" />
      </button>
      <label htmlFor={id} className={cn('flex min-w-0 flex-col gap-1', !disabled && 'cursor-pointer')}>
        <span id={`${id}-label`} className="text-label text-fg">{label}</span>
        {description && <span id={`${id}-desc`} className="text-body text-pretty text-fg">{description}</span>}
      </label>
    </div>
  )
}

export default Switch
