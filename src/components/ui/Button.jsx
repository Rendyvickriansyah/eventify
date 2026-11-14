import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/*
 * `secondary` = Figma "_Base Buttons" (white fill, black/10 border, bevel shadow).
 * Paddings are 1px smaller than Figma because Figma strokes are drawn inside the box.
 */
const variants = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-control text-fg border border-default shadow-control hover:bg-surface-hover active:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  subtle: 'bg-primary-subtle text-primary-subtle-fg hover:brightness-95',
  danger: 'bg-danger text-fg-inverse hover:bg-danger-hover focus-visible:ring-danger/20',
  link: 'h-auto px-0 text-primary hover:underline underline-offset-4',
  /* Figma "Add New Event": 40px, glass rim (1px border + 1px inset, strokes drawn inside in Figma)
     around a black/50 face with radius 10, 12 × 8 padding, 14/20 medium white. Ignores `size`. */
  glass: 'glass-dark h-10 rounded-lg border border-default p-px text-label text-white',
}

const sizes = {
  /* Figma "View More": 12/16 medium, 12 × 10 padding, radius 10, 36 tall */
  sm: 'gap-1 px-2.75 py-2.25 rounded-control text-label-sm text-shadow-button [&_svg]:size-4',
  md: 'h-10 gap-2 px-4 rounded-md text-label [&_svg]:size-5',
  lg: 'h-11 gap-2 px-5 rounded-md text-label [&_svg]:size-5',
}

/**
 * @param {{
 *   variant?: keyof typeof variants, size?: keyof typeof sizes,
 *   leftIcon?: React.ReactNode, rightIcon?: React.ReactNode,
 *   loading?: boolean, fullWidth?: boolean, as?: React.ElementType, className?: string
 * }} props
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  fullWidth = false,
  as: Comp = 'button',
  className,
  children,
  disabled,
  ...props
}) {
  const isButton = Comp === 'button'
  const isGlass = variant === 'glass'
  const content = (
    <>
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  )
  return (
    <Comp
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center whitespace-nowrap',
        /* `press`: 0.97 scale on :active as press feedback (components.css) */
        'press cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none',
        'focus-visible:ring-4 focus-visible:ring-primary/20',
        'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        variants[variant],
        !isGlass && sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...(isButton && { type: props.type ?? 'button' })}
      {...props}
    >
      {isGlass ? (
        <span className="glass-face glass-dark-face flex h-full w-full items-center justify-center gap-1 rounded-control px-3 transition-colors duration-150 [&_svg]:size-4">
          {content}
        </span>
      ) : (
        content
      )}
    </Comp>
  )
}

export default Button
