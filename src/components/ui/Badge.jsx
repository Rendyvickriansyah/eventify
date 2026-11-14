import { cn } from '@/lib/cn'

/* Figma "_Badge Base": 0.5px border, radius 6, 12/16 medium, padding 4 / 8 / 4 / 4 */
const tones = {
  neutral: 'bg-surface-muted border-default text-fg-soft',
  success: 'bg-success-subtle border-success-border text-success-fg',
  warning: 'bg-warning-subtle border-warning-border text-warning-fg',
  danger: 'bg-danger-subtle border-danger-border text-danger-fg',
  info: 'bg-info-subtle border-info-border text-info-fg',
  primary: 'bg-primary-subtle border-primary/40 text-primary-subtle-fg',
}

const dotTones = {
  neutral: 'bg-fg-subtle',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  primary: 'bg-primary',
}

/**
 * @param {{ tone?: keyof typeof tones, dot?: boolean, pill?: boolean, className?: string }} props
 */
export function Badge({ tone = 'neutral', dot = false, pill = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 overflow-hidden whitespace-nowrap',
        'badge-pad border-hairline rounded-sm text-label-sm',
        tones[tone],
        pill && 'rounded-full',
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  )
}

export default Badge
