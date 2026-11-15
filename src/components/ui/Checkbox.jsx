import { cn } from '@/lib/cn'
import checkIcon from '@/assets/icons/checkbox-check.svg'

/**
 * Checkbox — Figma "Checkbox Base" (node 223:22055): 16px, 4px radius, black fill with a
 * 0.5px white/10 inner edge and a 1px soft drop shadow; 14px white lucide check.
 * Unchecked (not drawn in Figma) is the same box, white with the default border.
 *
 * A real <input type="checkbox"> sits on top (invisible), so it works with keyboard, forms
 * and an enclosing <label> — wrap it in a label to make the whole cell clickable.
 *
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, name?: string,
 *           disabled?: boolean, className?: string } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export function Checkbox({ checked, onChange, className, disabled, ...props }) {
  return (
    <span className={cn('checkbox relative inline-flex size-4 shrink-0', disabled && 'opacity-50', className)} data-checked={checked || undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-1 m-0 size-full cursor-pointer appearance-none rounded-xs outline-none disabled:cursor-default"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          'checkbox-box flex size-4 items-center justify-center rounded-xs border shadow-[0_1px_1px_rgb(26_26_26/0.05)]',
          'peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20',
          checked ? 'border-white/10 bg-black dark:border-white/20' : 'border-strong bg-surface',
        )}
      >
        <img src={checkIcon} alt="" width="14" height="14" className="checkbox-check block size-3.5 max-w-none" />
      </span>
    </span>
  )
}

export default Checkbox
