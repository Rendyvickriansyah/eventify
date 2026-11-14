import { useLayoutEffect, useRef } from 'react'

/*
 * Count-up number — the figure runs from its previous value (0 on first paint) to the new one.
 * Purpose: state indication on page open, and continuity when a value changes (e.g. the balance
 * after a withdrawal). Seen once per visit, so it can take ~1s; it starts fast and settles
 * (ease-out-expo) so the real number is readable almost immediately.
 *
 * Frames write straight to the DOM (no React re-render per frame). The text is aria-hidden
 * while a visually hidden copy carries the final value, so screen readers never hear the
 * intermediate numbers. `tabular-nums` on the parent keeps the width from jittering.
 * Reduced motion: the final value is shown immediately.
 */

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param {{ value: number, format: (n: number) => string, duration?: number, delay?: number,
 *           className?: string }} props
 */
export function CountUp({ value, format, duration = 1000, delay = 0, className }) {
  const ref = useRef(null)
  const from = useRef(0) // the number currently on screen

  // Layout effect: set the starting number before paint, so the final value never flashes first.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined
    // Start from whatever is showing, so a change mid-count (or StrictMode's effect replay)
    // continues smoothly instead of jumping.
    const start = from.current
    if (start === value || reducedMotion()) {
      from.current = value
      node.textContent = format(value)
      return undefined
    }

    let frame = 0
    let t0 = 0
    node.textContent = format(start)
    const tick = (now) => {
      if (!t0) t0 = now + delay
      const t = Math.max(0, (now - t0) / duration)
      from.current = t >= 1 ? value : start + (value - start) * easeOutExpo(t)
      node.textContent = format(from.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, format, duration, delay])

  return (
    <span className={className}>
      <span ref={ref} aria-hidden>{format(value)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

/**
 * Count up a pre-formatted figure such as "$19,850.00", "8,750" or "12.4%": the prefix,
 * suffix, grouping and decimal places are kept; only the number moves.
 * @param {{ text: string, duration?: number, delay?: number, className?: string }} props
 */
export function CountUpText({ text, ...props }) {
  const match = /^(\D*?)(-?[\d,]*\.?\d+)(.*)$/.exec(text)
  if (!match) return text
  const [, prefix, digits, suffix] = match
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0
  const grouped = digits.includes(',')
  return (
    <CountUp
      value={Number(digits.replace(/,/g, ''))}
      format={formatter(prefix, suffix, decimals, grouped)}
      {...props}
    />
  )
}

// Stable formatter per shape, so CountUp's effect doesn't restart on every parent render.
const formatters = new Map()
function formatter(prefix, suffix, decimals, grouped) {
  const key = `${prefix}|${suffix}|${decimals}|${grouped}`
  if (!formatters.has(key)) {
    const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped })
    formatters.set(key, (n) => `${prefix}${nf.format(n)}${suffix}`)
  }
  return formatters.get(key)
}

export default CountUp
