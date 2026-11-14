import { useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Underline tabs — Figma "_Base Tabs 1": 16px padding, 14/20 text.
 * Active = semibold gray-900 with a 1px gray-900 bottom border (compact: black); inactive = regular black.
 * Each label reserves its semibold width so switching tabs doesn't shift the row.
 * Keyboard: ←/→ move between tabs, Home/End jump (automatic activation).
 *
 * @param {{
 *   tabs: { id: string, label: string }[],
 *   value: string,
 *   onChange: (id: string) => void,
 *   idPrefix: string,
 *   label?: string,
 *   variant?: 'default' | 'compact' | 'inline',
 *   className?: string,
 * }} props
 */
export function Tabs({ tabs, value, onChange, idPrefix, label, variant = 'default', className }) {
  const refs = useRef([])

  function handleKeyDown(event, index) {
    const last = tabs.length - 1
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={cn('flex h-full items-end', variant === 'compact' && 'gap-7', variant === 'inline' && 'gap-4', className)}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[index] = el }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative grid cursor-pointer place-items-center border-b text-body whitespace-nowrap outline-none',
              /* compact = Account tabs (12px vertical, 28px gap); inline = event tabs (16px vertical, 16px gap). No x-padding, black underline. */
              { default: 'p-4', compact: 'py-3', inline: 'py-4' }[variant],
              'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset',
              selected
                ? cn('font-semibold', variant !== 'default' ? 'border-fg text-fg' : 'border-gray-900 text-gray-900 dark:border-fg dark:text-fg')
                : 'border-transparent text-fg hover:text-fg-muted',
            )}
          >
            {/* Invisible semibold copy reserves the active width */}
            <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{tab.label}</span>
            <span className="col-start-1 row-start-1">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
