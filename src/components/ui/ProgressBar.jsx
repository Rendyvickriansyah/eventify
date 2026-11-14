import { cn } from '@/lib/cn'

/**
 * Figma ticket progress: 150 × 6 gray-100 track, green-600 fill, fully rounded.
 * Exposed as a meter; pass `label` when no visible text names it.
 *
 * @param {{ value: number, max: number, label?: string, className?: string }} props
 */
export function ProgressBar({ value, max, label, className }) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('block h-1.5 w-37.5 overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <span className="block h-full rounded-full bg-success" style={{ width: `${ratio * 100}%` }} />
    </span>
  )
}

export default ProgressBar
