import { cn } from '@/lib/cn'

const variants = {
  /* Figma header action buttons: 32×32, radius 8, white + bevel */
  secondary: 'bg-control text-fg border border-default shadow-control hover:bg-surface-hover active:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  /* Bare icon (sidebar "Panel Closed") — no chrome, enlarged hit area */
  plain: 'hit-area text-fg hover:opacity-70',
}

const sizes = {
  xs: 'size-4 rounded-xs',
  sm: 'size-8 rounded-md',
  md: 'size-10 rounded-md',
}

/**
 * Icon-only button. `aria-label` is required.
 * @param {{ variant?: keyof typeof variants, size?: keyof typeof sizes, badge?: boolean,
 *           'aria-label': string, className?: string, children: React.ReactNode }} props
 */
export function IconButton({ variant = 'secondary', size = 'sm', badge = false, className, children, ...props }) {
  if (import.meta.env.DEV && !props['aria-label']) {
    console.warn('IconButton requires an aria-label')
  }
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center',
        'transition-[background-color,opacity] duration-150 outline-none',
        'focus-visible:ring-4 focus-visible:ring-primary/20',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
      {badge && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
      )}
    </button>
  )
}

export default IconButton
