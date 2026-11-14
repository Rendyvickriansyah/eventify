import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

const TOOLTIP_WIDTH = 224
const TOOLTIP_GAP = 12
const EDGE = 4

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const integer = new Intl.NumberFormat('en-US')
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/**
 * Plot area rendering exported Figma chart layers (grid, area fill, line) stacked
 * at their Figma positions. Each layer spans `layerWidth` of the plot width and is
 * clipped by the plot box, exactly like the Figma frame (overflow: clip).
 *
 * When `points` are given, hovering / scrubbing (or arrow keys while focused)
 * snaps a marker to the nearest point and shows its transaction details.
 *
 * @param {{
 *   layers: { src: string, top: number, height: number }[],
 *   points?: { id: string, x: number, y: number, value: number, date: string, orders: number,
 *              tickets: number, change: number | null, breakdown: { label: string, value: number }[] }[],
 *   layerWidth?: string,
 *   summary?: string,
 *   className?: string,
 * }} props
 */
export function AreaChart({ layers = [], points = [], layerWidth = '99.6%', summary, className, ...props }) {
  const plotRef = useRef(null)
  const tooltipRef = useRef(null)
  const [plot, setPlot] = useState({ width: 0, height: 0 })
  const [tooltipHeight, setTooltipHeight] = useState(0)
  // `glide`: animate position only when moving between points with a pointer.
  // Appearing from hidden, or keyboard stepping, jumps instantly.
  const [hover, setHover] = useState({ index: null, visible: false, glide: false })

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setPlot({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (tooltipRef.current) setTooltipHeight(tooltipRef.current.offsetHeight)
  }, [hover.index])

  const interactive = points.length > 0
  const point = hover.index != null ? points[hover.index] : null

  function show(index, glide) {
    setHover((prev) =>
      prev.index === index && prev.visible ? prev : { index, visible: true, glide: glide && prev.visible },
    )
  }

  function handlePointerMove(event) {
    if (!interactive) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fx = (event.clientX - rect.left) / rect.width
    let nearest = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - fx) < Math.abs(points[nearest].x - fx)) nearest = i
    }
    show(nearest, true)
  }

  function hide() {
    setHover((prev) => (prev.visible ? { ...prev, visible: false } : prev))
  }

  function handleKeyDown(event) {
    if (!interactive) return
    const current = hover.visible && hover.index != null ? hover.index : -1
    const last = points.length - 1
    const next = {
      ArrowRight: Math.min(current + 1, last),
      ArrowLeft: current < 0 ? last : Math.max(current - 1, 0),
      Home: 0,
      End: last,
    }[event.key]
    if (next !== undefined) {
      event.preventDefault()
      show(next, false)
    } else if (event.key === 'Escape') {
      hide()
    }
  }

  // Marker + tooltip geometry (px, plot-relative)
  const dotX = point ? point.x * plot.width : 0
  const dotY = point ? point.y : 0
  const flip = dotX + TOOLTIP_GAP + TOOLTIP_WIDTH > plot.width - EDGE
  const tipX = flip ? dotX - TOOLTIP_GAP - TOOLTIP_WIDTH : dotX + TOOLTIP_GAP
  const tipY = Math.min(Math.max(dotY - tooltipHeight / 2, EDGE), Math.max(plot.height - tooltipHeight - EDGE, EDGE))
  const glide = hover.visible && hover.glide

  return (
    <div
      ref={plotRef}
      role={interactive ? 'group' : 'img'}
      aria-label={summary}
      aria-roledescription={interactive ? 'chart' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={hide}
      onKeyDown={handleKeyDown}
      onBlur={hide}
      className={cn(
        'relative h-50.5 w-full shrink-0 rounded-xs outline-none select-none',
        interactive && 'cursor-crosshair focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        {layers.map((layer) => (
          <img
            key={layer.src}
            src={layer.src}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute left-0 block max-w-none dark:invert dark:hue-rotate-180"
            style={{ top: layer.top, height: layer.height, width: layerWidth }}
          />
        ))}

        {interactive && (
          /* Veil over the part of the chart after the active point, so the scrubbed range reads as "so far" */
          <div
            aria-hidden
            data-glide={glide || undefined}
            className="chart-glide chart-fade pointer-events-none absolute inset-y-0 left-0 w-full bg-surface/60"
            style={{ transform: `translate3d(${dotX}px, 0, 0)`, opacity: hover.visible ? 1 : 0 }}
          />
        )}
      </div>

      {interactive && point && (
        <>
          {/* Guide line */}
          <div
            aria-hidden
            data-glide={glide || undefined}
            className="chart-glide pointer-events-none absolute inset-y-0 left-0 w-px"
            style={{ transform: `translate3d(${dotX}px, 0, 0)` }}
          >
            <div
              className="chart-fade h-full w-full bg-strong"
              style={{ opacity: hover.visible ? 1 : 0 }}
            />
          </div>

          {/* Marker */}
          <div
            aria-hidden
            data-glide={glide || undefined}
            className="chart-glide pointer-events-none absolute top-0 left-0"
            style={{ transform: `translate3d(${dotX - 5}px, ${dotY - 5}px, 0)` }}
          >
            <div
              className="chart-pop size-2.5 rounded-full border-2 border-surface bg-[#079C0A] shadow-[0_0_0_4px_rgb(7_156_10/0.18)]"
              data-visible={hover.visible || undefined}
            />
          </div>

          {/* Tooltip */}
          <div
            aria-hidden
            data-glide={glide || undefined}
            className="chart-glide pointer-events-none absolute top-0 left-0 z-10"
            style={{ width: TOOLTIP_WIDTH, transform: `translate3d(${tipX}px, ${tipY}px, 0)` }}
          >
            <div
              ref={tooltipRef}
              data-visible={hover.visible || undefined}
              className="chart-pop rounded-lg border border-default bg-surface p-2.5 shadow-lg"
              style={{ transformOrigin: flip ? 'right center' : 'left center' }}
            >
              <TooltipBody point={point} />
            </div>
          </div>
        </>
      )}

      {interactive && (
        <p className="sr-only" aria-live="polite">
          {hover.visible && point
            ? `${point.date}: ${currency.format(point.value)} revenue, ${point.orders} orders, ${point.tickets} tickets.`
            : ''}
        </p>
      )}
    </div>
  )
}

function TooltipBody({ point }) {
  const up = point.change != null && point.change >= 0
  return (
    <>
      <p className="text-caption text-fg-subtle">{point.date}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="text-label text-fg tabular-nums">{currency.format(point.value)}</p>
        {point.change != null && (
          <span className={cn('text-label-sm tabular-nums', up ? 'text-success-fg' : 'text-danger-fg')}>
            {up ? '▲' : '▼'} {percent.format(Math.abs(point.change))}
          </span>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-default pt-2">
        <div>
          <dt className="text-caption text-fg-subtle">Orders</dt>
          <dd className="text-label-sm text-fg tabular-nums">{integer.format(point.orders)}</dd>
        </div>
        <div>
          <dt className="text-caption text-fg-subtle">Tickets sold</dt>
          <dd className="text-label-sm text-fg tabular-nums">{integer.format(point.tickets)}</dd>
        </div>
      </dl>

      <ul className="mt-2 space-y-1 border-t border-default pt-2">
        {point.breakdown.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2 text-caption">
            <span className="text-fg-muted">{row.label}</span>
            <span className="text-fg tabular-nums">{currency.format(row.value)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default AreaChart
