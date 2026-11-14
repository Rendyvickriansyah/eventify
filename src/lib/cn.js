import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge must know our custom tokens; otherwise `text-body` (font-size)
 * and `text-fg` (color) are treated as the same group and one gets dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'h3', 'h4', 'metric', 'body-lg', 'body', 'body-sm', 'label', 'label-sm', 'caption', 'overline'],
      radius: ['inner', 'control'],
      shadow: ['control'],
      'text-shadow': ['button'],
    },
    classGroups: {
      'border-w': ['border-hairline'],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
