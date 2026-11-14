import { cn } from '@/lib/cn'

const sizes = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
}

/**
 * Renders an exported Figma SVG icon (stored in src/assets/icons).
 * Decorative by default; pass `alt` to expose it to assistive tech.
 * @param {{ src: string, size?: keyof typeof sizes, alt?: string, className?: string }} props
 */
export function Icon({ src, size = 'sm', alt = '', className, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={cn('block shrink-0 select-none dark:invert', sizes[size], className)}
      {...props}
    />
  )
}

export default Icon
