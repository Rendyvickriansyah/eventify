import { cn } from '@/lib/cn'
import infoIcon from '@/assets/icons/info.svg'
import { Icon } from './Icon'

/**
 * Inline notice — Figma "Banner / _Base Banner": black/10 border, radius 12,
 * 12px padding (11 + 1px border), 12px gap, 18px info icon, 14/20 text.
 *
 * @param {{ icon?: string, className?: string, children: React.ReactNode }} props
 */
export function Banner({ icon = infoIcon, className, children, ...props }) {
  return (
    <div
      role="note"
      className={cn('flex w-full items-center gap-3 rounded-lg border border-default p-2.75 text-body text-fg', className)}
      {...props}
    >
      <Icon src={icon} className="size-4.5" />
      <p className="min-w-0 flex-1">{children}</p>
    </div>
  )
}

export default Banner
