import { cn } from '@/lib/cn'

/* Figma cards: white, black/10 1px border, radius 12, no shadow.
   `md` = 15px padding + 1px border = 16px visual (Figma draws strokes inside). */
const paddings = {
  none: '',
  md: 'p-3.75',
}

/**
 * @param {{ padding?: keyof typeof paddings, as?: React.ElementType, className?: string }} props
 */
export function Card({ padding = 'md', as: Comp = 'div', className, ...props }) {
  return (
    <Comp
      className={cn('rounded-lg border border-default bg-surface', paddings[padding], className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex items-start justify-between gap-4', className)} {...props} />
}

function CardTitle({ as: Comp = 'h3', className, ...props }) {
  return <Comp className={cn('text-label text-fg', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-body text-fg-muted', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn(className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return <div className={cn('border-t border-default pt-4', className)} {...props} />
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
