import { useEffect, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Check, Contrast, X, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Minus, Plus, RotateCwSquare, Scan } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { seatingTypes } from '@/data/seating'
import { Panel, SideField, Segmented } from './PanelParts'
import { textContrast } from './contrast'
import { DEFAULT_FILL, DEFAULT_STROKE, labelFontSize, autoLabelColor, effectiveFill, cornerRadius, hasCorners, isAssignable, measureText, normalizeAngle, objectOpacity, strokeOf } from './geometry'

/*
 * Right sidebar while something is selected.
 *  - Sections / shapes, with a ticket tier armed on the left → Figma "Section Setting" +
 *    "Seating" (149:10851): Section Name, Tier / Category, Seating Type, Total Seats, then
 *    "Assign Ticket". Several selected → the seat count is per section and names are kept.
 *    Without an armed tier the assign form stays hidden: shapes show their fill (or, when
 *    assigned, which tier they sell under).
 *  - Always on top: Rotation (angle, rotate 90°, flip horizontal / vertical), Appearance
 *    (opacity, corner radius, show/hide), Fill and Stroke — the Figma design-panel pattern.
 *  - Text → content, size, colour.  Delete with the keyboard.
 * Text and image edits preview live and land in history as one step when the field blurs.
 */

const digits = (v) => v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
const count = (n) => n.toLocaleString('en-US')
const seatingOptions = seatingTypes.map((t) => ({ value: t, label: t }))

const dots = new Map()
/** SelectMenu icon: a tier's colour dot (cached per colour so options stay stable). */
function dotFor(color) {
  if (!dots.has(color)) {
    const Dot = ({ className }) => <span className={cn(className, 'inline-block size-3! shrink-0 rounded-full')} style={{ backgroundColor: color }} />
    dots.set(color, Dot)
  }
  return dots.get(color)
}

/** One undo step per focus → blur, with live previews in between. */
function useEditSession(scene, objects) {
  const base = useRef(null)
  return {
    begin: () => { base.current ??= objects },
    end: () => { if (base.current) scene.commit(base.current); base.current = null },
  }
}

/**
 * @param {{
 *   objects: import('./geometry').SceneObject[], selected: import('./geometry').SceneObject[],
 *   scene: ReturnType<typeof import('./useScene').useScene>,
 *   tiers: { id: string, name: string, color: string, seats: number, assigned: number }[],
 *   armedTier: { id: string } | null,
 *   onAssigned: (tierId: string, sections: number) => void,
 * }} props
 */
export function SelectionPanel({ objects, selected, scene, tiers, armedTier, onAssigned, canvasBackground = '#F0F0F0' }) {
  const tierColor = (o) => tiers.find((t) => t.id === o.tierId)?.color
  const kinds = new Set(selected.map((o) => o.type))
  const onlyText = kinds.size === 1 && kinds.has('text')
  const onlyImage = kinds.size === 1 && kinds.has('image')
  const key = selected.map((o) => o.id).join()

  return (
    <>
      <RotationPanel key={`r-${key}`} selected={selected} objects={objects} scene={scene} />
      <AppearancePanel key={`a-${key}`} selected={selected} objects={objects} scene={scene} />
      {!onlyImage && <FillPanel key={`f-${key}`} selected={selected.filter((o) => o.type !== 'image')} objects={objects} scene={scene} />}
      {selected.some(hasStroke) && <StrokePanel key={`s-${key}`} selected={selected.filter(hasStroke)} objects={objects} scene={scene} />}
      {onlyText ? (
        <TextPanel key={key} object={selected[0]} objects={objects} scene={scene} canvasBackground={canvasBackground} />
      ) : onlyImage ? null /* guide images: lock / hide from the Layers tab */ : !armedTier ? (
        <>
          <ShapeTextPanel key={`t-${key}`} selected={selected.filter(isAssignable)} objects={objects} scene={scene} canvasBackground={canvasBackground} tierColor={tierColor} />
          <ShapePanel key={key} selected={selected.filter(isAssignable)} scene={scene} tiers={tiers} />
        </>
      ) : (
        <SectionPanel key={key} selected={selected.filter((o) => o.type !== 'text' && o.type !== 'image')} scene={scene} tiers={tiers} armedTier={armedTier} onAssigned={onAssigned} />
      )}
    </>
  )
}

function SectionPanel({ selected, scene, tiers, armedTier, onAssigned }) {
  const multi = selected.length > 1
  const common = (k) => {
    const values = new Set(selected.map((o) => o[k]))
    return values.size === 1 ? [...values][0] : undefined
  }
  const [form, setForm] = useState(() => ({
    name: multi ? '' : (selected[0]?.name ?? ''),
    tierId: armedTier?.id ?? common('tierId') ?? '',
    seatingType: common('seatingType') ?? seatingTypes[0],
    seats: common('seats') != null ? String(common('seats')) : '',
  }))
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])

  // Picking another tier on the left re-targets the open form.
  useEffect(() => { if (armedTier) setForm((f) => ({ ...f, tierId: armedTier.id })) }, [armedTier])

  if (!selected.length) return null

  const tier = tiers.find((t) => t.id === form.tierId)
  const seats = Number(form.seats || 0)
  const assignedHere = selected.filter((o) => o.tierId === form.tierId).reduce((s, o) => s + (o.seats ?? 0), 0)
  const left = tier ? tier.seats - (tier.assigned - assignedHere) : 0
  const allAssigned = selected.every((o) => o.tierId)
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function submit(e) {
    e.preventDefault()
    const next = {}
    if (!multi && !form.name.trim()) next.name = 'Name the section so buyers can find it, e.g. “36”.'
    if (!tier) next.tierId = 'Pick the ticket tier these seats sell under.'
    if (!(seats >= 1)) next.seats = multi ? 'Enter the seats in each section (at least 1).' : 'Enter how many seats this section holds.'
    else if (tier && seats * selected.length > left) next.seats = `Only ${count(Math.max(0, left))} seats left in ${tier.name} (${count(tier.seats)} total).`
    setErrors(next)
    if (Object.keys(next).length) return
    const ids = new Set(selected.map((o) => o.id))
    scene.apply((list) => list.map((o) => (ids.has(o.id)
      ? { ...o, tierId: tier.id, seatingType: form.seatingType, seats, ...(!multi && { name: form.name.trim() }) }
      : o)))
    onAssigned(tier.id, selected.length)
    setDone(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(false), 1400)
  }

  function unassign() {
    const ids = new Set(selected.map((o) => o.id))
    scene.apply((list) => list.map((o) => {
      if (!ids.has(o.id)) return o
      const { tierId: _t, seatingType: _s, seats: _n, ...rest } = o
      return rest
    }))
    setForm((f) => ({ ...f, seats: '' }))
  }

  const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name, icon: dotFor(t.color) }))

  return (
    <form noValidate onSubmit={submit} className="flex flex-col">
      <Panel title={multi ? `Section · ${selected.length} selected` : 'Section'} className="border-b border-default">
        <div className="flex flex-col gap-4">
          <SideField label="Section Name" error={errors.name} hint={multi ? 'Each section keeps its own name.' : undefined}>
            {(id, describedBy) => (
              <TextInput
                id={id} aria-describedby={describedBy} invalid={Boolean(errors.name)}
                value={multi ? '' : form.name} disabled={multi} placeholder={multi ? `${selected.length} sections` : 'e.g. 36'}
                maxLength={24} autoComplete="off" onChange={(e) => set('name', e.target.value)}
              />
            )}
          </SideField>
          <SideField label="Tier / Category" error={errors.tierId} hint={!tiers.length ? 'Add a ticket type first — tiers come from Ticket List.' : undefined}>
            {(id, describedBy) => (
              <SelectMenu id={id} aria-describedby={describedBy} invalid={Boolean(errors.tierId)} value={form.tierId} onChange={(v) => set('tierId', v)} options={tierOptions} placeholder="Select tier" />
            )}
          </SideField>
        </div>
      </Panel>
      <Panel title="Seating" className="border-b border-default">
        <div className="flex flex-col gap-4">
          <SideField label="Seating Type">
            {(id) => <SelectMenu id={id} value={form.seatingType} onChange={(v) => set('seatingType', v)} options={seatingOptions} />}
          </SideField>
          <SideField
            label={multi ? 'Seats per Section' : 'Total Seats'}
            error={errors.seats}
            hint={!errors.seats && (multi && seats ? `${selected.length} × ${count(seats)} = ${count(seats * selected.length)} seats` : tier ? `${count(Math.max(0, left))} of ${count(tier.seats)} ${tier.name} seats left` : undefined)}
          >
            {(id, describedBy) => (
              <TextInput
                id={id} aria-describedby={describedBy} invalid={Boolean(errors.seats)}
                value={form.seats} onChange={(e) => set('seats', digits(e.target.value))}
                inputMode="numeric" maxLength={6} placeholder="e.g. 250" autoComplete="off" className="tabular-nums"
              />
            )}
          </SideField>
          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" variant="glass" className="w-full" data-done={done || undefined}>
              <span key={done ? 'done' : 'idle'} className="assign-label flex items-center gap-1.5">
                {done ? <><Check aria-hidden className="size-4" strokeWidth={2.5} />Assigned</> : allAssigned ? 'Update Assignment' : 'Assign Ticket'}
              </span>
            </Button>
            {selected.some((o) => o.tierId) && (
              <Button variant="ghost" onClick={unassign} className="h-9 rounded-md text-body">Remove Assignment</Button>
            )}
          </div>
        </div>
      </Panel>
    </form>
  )
}

/** Shapes selected without an armed tier: fill colour, or the tier they're assigned to. */
function ShapePanel({ selected, scene, tiers }) {
  if (!selected.length) return null
  const ids = new Set(selected.map((o) => o.id))
  const assigned = selected.filter((o) => o.tierId)
  if (!assigned.length) return null
  const byTier = tiers
    .map((t) => ({ ...t, here: assigned.filter((o) => o.tierId === t.id) }))
    .filter((t) => t.here.length)
  return (
    <Panel title="Ticket" className="border-b border-default">
      <ul className="flex flex-col gap-2">
        {byTier.map((t) => (
          <li key={t.id} className="flex items-center gap-2.5 text-body text-fg">
            <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
            <span className="text-fg-muted tabular-nums">{count(t.here.reduce((n, o) => n + (o.seats ?? 0), 0))} seats</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-pretty text-fg-muted">Pick a ticket tier on the left to change the assignment.</p>
      <Button
        variant="ghost"
        className="h-9 rounded-md text-body"
        onClick={() => scene.apply((list) => list.map((o) => {
          if (!ids.has(o.id)) return o
          const { tierId: _t, seatingType: _s, seats: _n, ...rest } = o
          return rest
        }))}
      >
        Remove Assignment
      </Button>
    </Panel>
  )
}

/** Angle glyph (Figma "Rotation" input) — two rays and an arc. */
function AngleIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v10h10" />
      <path d="M3 8.5a4.5 4.5 0 0 1 4.5 4.5" />
    </svg>
  )
}

/** Opacity glyph — a checkerboard square, like Figma's. */
function OpacityIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5h3v3H5zM8 8h3v3H8z" fill="currentColor" />
    </svg>
  )
}

/** 36px icon button in the Figma toolbar style. */
function IconButton({ label, pressed, onClick, disabled, children }) {
  return (
    <button
      type="button" aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}
      className={cn(
        'seat-tool flex size-9 cursor-pointer items-center justify-center rounded-md text-fg outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-default disabled:opacity-40',
        pressed ? 'bg-surface shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Number field that previews while typing, commits one undo step on blur / Enter, and steps
 * with ↑/↓ (Shift ×10). `format` adds the unit; `parse` reads what was typed.
 */
function NumberField({ id, value, mixed, format, parse, clamp, step = 1, leading, disabled, onPreview, onBegin, onEnd, label }) {
  const [text, setText] = useState(null) // null → show the formatted value
  const shown = text ?? (mixed ? 'Mixed' : format(value))
  const commit = (raw) => {
    const n = parse(raw)
    if (Number.isFinite(n)) onPreview(clamp(n))
  }
  return (
    <TextInput
      id={id} aria-label={label} value={disabled ? '–' : shown} disabled={disabled} inputMode="decimal" autoComplete="off" className="pl-9 tabular-nums"
      leading={leading}
      onFocus={(e) => { onBegin(); setText(mixed ? '' : String(format(value))); requestAnimationFrame(() => e.target.select()) }}
      onChange={(e) => { setText(e.target.value); commit(e.target.value) }}
      onBlur={() => { setText(null); onEnd() }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') return e.currentTarget.blur()
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        const next = clamp((mixed ? 0 : value) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1))
        onPreview(next)
        setText(String(format(next)))
      }}
    />
  )
}

/** Shared helpers for the transform/appearance panels: one value across the selection, live edits. */
function useSelectionEdit(selected, objects, scene) {
  const session = useEditSession(scene, objects)
  const ids = new Set(selected.map((o) => o.id))
  const common = (fn) => {
    const values = new Set(selected.map(fn))
    return values.size === 1 ? [...values][0] : undefined
  }
  const map = (fn) => (list) => list.map((o) => (ids.has(o.id) ? fn(o) : o))
  return { session, common, preview: (fn) => scene.preview(map(fn)), apply: (fn) => scene.apply(map(fn)) }
}

/** Figma "Rotation": angle input, then rotate 90° · flip horizontal · flip vertical. */
function RotationPanel({ selected, objects, scene }) {
  const { session, common, preview, apply } = useSelectionEdit(selected, objects, scene)
  const angle = common((o) => o.rotation || 0)
  return (
    <Panel title="Rotation" className="border-b border-default">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NumberField
            label="Rotation in degrees" value={angle ?? 0} mixed={angle === undefined}
            format={(v) => `${normalizeAngle(v)}°`} parse={(t) => parseFloat(String(t).replace(/[^0-9.-]/g, ''))} clamp={normalizeAngle}
            leading={<AngleIcon className="size-4 text-fg-muted" />}
            onBegin={session.begin} onEnd={session.end} onPreview={(deg) => preview((o) => ({ ...o, rotation: deg }))}
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-neutral-100 p-0.5 dark:bg-surface-muted">
          <IconButton label="Rotate 90°" onClick={() => apply((o) => ({ ...o, rotation: normalizeAngle((o.rotation || 0) + 90) }))}>
            <RotateCwSquare aria-hidden className="size-4" strokeWidth={1.75} />
          </IconButton>
          {/* lucide's glyph names are the other way round: FlipVertical2 draws a vertical mirror axis (◁|▷) */}
          <IconButton label="Flip horizontal" onClick={() => apply((o) => ({ ...o, flipX: !o.flipX }))}>
            <FlipVertical2 aria-hidden className="size-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Flip vertical" onClick={() => apply((o) => ({ ...o, flipY: !o.flipY }))}>
            <FlipHorizontal2 aria-hidden className="size-4" strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>
    </Panel>
  )
}

/** Figma "Appearance": show/hide + fill in the header, then opacity and corner radius. */
function AppearancePanel({ selected, objects, scene }) {
  const { session, common, preview, apply } = useSelectionEdit(selected, objects, scene)
  const opacity = common((o) => Math.round(objectOpacity(o) * 100))
  const cornered = selected.filter(hasCorners)
  const radius = cornered.length ? new Set(cornered.map((o) => Math.round(cornerRadius(o)))) : null
  const hidden = selected.every((o) => o.hidden)
  return (
    <Panel
      title="Appearance"
      className="border-b border-default"
      actions={
        <>
          <IconButton label={hidden ? 'Show' : 'Hide'} pressed={hidden} onClick={() => apply((o) => ({ ...o, hidden: !hidden }))}>
            {hidden ? <EyeOff aria-hidden className="size-4" strokeWidth={1.75} /> : <Eye aria-hidden className="size-4" strokeWidth={1.75} />}
          </IconButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <SideField label="Opacity">
          {(id) => (
            <NumberField
              id={id} value={opacity ?? 100} mixed={opacity === undefined}
              format={(v) => `${v}%`} parse={(t) => parseFloat(String(t).replace(/[^0-9.]/g, ''))} clamp={(v) => Math.max(0, Math.min(100, Math.round(v)))}
              leading={<OpacityIcon className="size-4 text-fg-muted" />}
              onBegin={session.begin} onEnd={session.end} onPreview={(v) => preview((o) => ({ ...o, opacity: v / 100 }))}
            />
          )}
        </SideField>
        <SideField label="Corner radius">
          {(id) => (
            <NumberField
              id={id} value={radius?.size === 1 ? [...radius][0] : 0} mixed={radius?.size > 1} disabled={!cornered.length}
              format={(v) => String(v)} parse={(t) => parseFloat(String(t).replace(/[^0-9.]/g, ''))} clamp={(v) => Math.max(0, Math.round(v))}
              leading={<Scan aria-hidden className="size-4 text-fg-muted" strokeWidth={1.75} />}
              onBegin={session.begin} onEnd={session.end}
              onPreview={(v) => preview((o) => (hasCorners(o) ? { ...o, radius: v } : o))}
            />
          )}
        </SideField>
      </div>
    </Panel>
  )
}

const alignOptions = [
  { value: 'left', label: 'Align left', icon: AlignLeft, iconOnly: true },
  { value: 'center', label: 'Align center', icon: AlignCenter, iconOnly: true },
  { value: 'right', label: 'Align right', icon: AlignRight, iconOnly: true },
]

/** Figma "Alignment": left / center / right. `value` undefined = mixed (nothing pressed). */
function AlignmentField({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-sm text-fg">Alignment</span>
      <Segmented label="Text alignment" value={value} options={alignOptions} onChange={onChange} />
    </div>
  )
}

const hasStroke = (o) => o.type !== 'text' && o.type !== 'image'
const HEX = /^#?([0-9a-f]{6})$/i

/**
 * Figma paint row: [swatch · HEX | opacity %] then show/hide and remove.
 * The swatch opens the native picker; hex commits once it's 6 digits; % steps with ↑/↓.
 * `disabled` greys the colour part (assigned shapes take their tier's colour).
 */
function PaintRow({ label, color, mixed, opacity, hidden, disabled, disabledHint, onBegin, onEnd, onPreview, onApply, onToggle, onRemove }) {
  const [hex, setHex] = useState(null)
  const [pct, setPct] = useState(null)
  const shownHex = hex ?? (mixed ? 'Mixed' : color.replace('#', '').toUpperCase())
  const shownPct = pct ?? (opacity == null ? '' : String(opacity))
  const setPctBy = (n) => { const v = Math.max(0, Math.min(100, Math.round(n))); onPreview({ opacity: v / 100 }); setPct(String(v)) }
  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'flex h-9 min-w-0 flex-1 items-center rounded-md border border-default bg-surface transition-[border-color,box-shadow] duration-150 ease-out',
          'hover:border-strong focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20',
          hidden && 'opacity-50',
        )}
        title={disabled ? disabledHint : undefined}
      >
        <label className={cn('relative ml-2 block size-4 shrink-0 overflow-hidden rounded-xs border border-black/10', disabled ? 'cursor-not-allowed' : 'cursor-pointer')} style={{ backgroundColor: color }}>
          <span className="sr-only">Pick {label.toLowerCase()} colour</span>
          <input
            type="color" disabled={disabled} value={color.toLowerCase()}
            onFocus={onBegin} onBlur={onEnd}
            onChange={(e) => onPreview({ color: e.target.value.toUpperCase() })}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <input
          aria-label={`${label} colour (hex)`} value={shownHex} disabled={disabled} maxLength={7} spellCheck={false} autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent pl-2 text-body text-fg uppercase tabular-nums outline-none disabled:text-fg-muted"
          onFocus={(e) => { onBegin(); setHex(mixed ? '' : color.replace('#', '').toUpperCase()); requestAnimationFrame(() => e.target.select()) }}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-f#]/gi, '').replace('#', '').slice(0, 6)
            setHex(v.toUpperCase())
            if (HEX.test(v)) onPreview({ color: `#${v.toUpperCase()}` })
          }}
          onBlur={() => { setHex(null); onEnd() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
        />
        <span aria-hidden className="h-5 w-px bg-black/10 dark:bg-white/10" />
        <input
          aria-label={`${label} opacity (%)`} value={shownPct} inputMode="numeric" maxLength={3} autoComplete="off"
          className="h-full w-9 bg-transparent pl-2 text-right text-body text-fg tabular-nums outline-none"
          onFocus={(e) => { onBegin(); setPct(shownPct); requestAnimationFrame(() => e.target.select()) }}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setPct(v); if (v !== '') setPctBy(Number(v)) }}
          onBlur={() => { setPct(null); onEnd() }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') return e.currentTarget.blur()
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            e.preventDefault()
            setPctBy((opacity ?? 100) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1))
          }}
        />
        <span aria-hidden className="pr-2 pl-0.5 text-caption text-fg-muted">%</span>
      </div>
      <IconButton label={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`} pressed={hidden} onClick={onToggle}>
        {hidden ? <EyeOff aria-hidden className="size-4" strokeWidth={1.75} /> : <Eye aria-hidden className="size-4" strokeWidth={1.75} />}
      </IconButton>
      <IconButton label={`Remove ${label.toLowerCase()}`} onClick={onRemove}>
        <Minus aria-hidden className="size-4" strokeWidth={1.75} />
      </IconButton>
    </div>
  )
}

/** Figma "Fill": one paint per object — colour, opacity, show/hide; − removes it, + brings it back. */
function FillPanel({ selected, objects, scene }) {
  const { session, common, preview, apply } = useSelectionEdit(selected, objects, scene)
  if (!selected.length) return null
  const filled = selected.filter((o) => o.fill !== null)
  const tiered = selected.every((o) => o.tierId)
  const color = common((o) => (o.fill ?? (o.type === 'text' ? '#0A0A0A' : DEFAULT_FILL)).toUpperCase())
  const opacity = common((o) => Math.round((o.fillOpacity ?? 1) * 100))
  return (
    <Panel
      title="Fill"
      className="border-b border-default"
      actions={!filled.length && (
        <IconButton label="Add fill" onClick={() => apply((o) => ({ ...o, fill: o.type === 'text' ? '#0A0A0A' : DEFAULT_FILL, fillHidden: false }))}>
          <Plus aria-hidden className="size-4" strokeWidth={1.75} />
        </IconButton>
      )}
    >
      {filled.length > 0 && (
        <PaintRow
          label="Fill"
          color={color ?? DEFAULT_FILL} mixed={color === undefined}
          opacity={opacity} hidden={filled.every((o) => o.fillHidden)}
          disabled={tiered} disabledHint="Assigned sections take their ticket tier’s colour"
          onBegin={session.begin} onEnd={session.end}
          onPreview={({ color: c, opacity: a }) => preview((o) => (o.fill === null ? o : { ...o, ...(c && { fill: c }), ...(a != null && { fillOpacity: a }) }))}
          onToggle={() => { const hide = !filled.every((o) => o.fillHidden); apply((o) => ({ ...o, fillHidden: hide })) }}
          onRemove={() => apply((o) => ({ ...o, fill: null }))}
        />
      )}
    </Panel>
  )
}

const strokePositions = [
  { value: 'inside', label: 'Inside' },
  { value: 'center', label: 'Center' },
  { value: 'outside', label: 'Outside' },
]

/** Stroke weight glyph — three lines, thin to thick. */
function WeightIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" {...props}>
      <path d="M3 4h10" strokeWidth="1" />
      <path d="M3 8h10" strokeWidth="1.6" />
      <path d="M3 12.25h10" strokeWidth="2.4" />
    </svg>
  )
}

/** Figma "Stroke": paint row, then Position (inside / center / outside) and Weight. */
function StrokePanel({ selected, objects, scene }) {
  const { session, common, preview, apply } = useSelectionEdit(selected, objects, scene)
  const stroked = selected.filter((o) => strokeOf(o).color)
  const color = common((o) => (strokeOf(o).color ?? DEFAULT_STROKE).toUpperCase())
  const opacity = common((o) => Math.round((o.strokeOpacity ?? 1) * 100))
  const position = common((o) => o.strokePosition ?? 'center')
  const weight = common((o) => strokeOf(o).width)
  return (
    <Panel
      title="Stroke"
      className="border-b border-default"
      actions={!stroked.length && (
        <IconButton label="Add stroke" onClick={() => apply((o) => ({ ...o, stroke: '#000000', strokeHidden: false, strokeWidth: o.strokeWidth ?? 1 }))}>
          <Plus aria-hidden className="size-4" strokeWidth={1.75} />
        </IconButton>
      )}
    >
      {stroked.length > 0 && (
        <>
          <PaintRow
            label="Stroke"
            color={color ?? DEFAULT_STROKE} mixed={color === undefined}
            opacity={opacity} hidden={stroked.every((o) => o.strokeHidden)}
            onBegin={session.begin} onEnd={session.end}
            onPreview={({ color: c, opacity: a }) => preview((o) => (!strokeOf(o).color ? o : { ...o, ...(c && { stroke: c }), ...(a != null && { strokeOpacity: a }) }))}
            onToggle={() => { const hide = !stroked.every((o) => o.strokeHidden); apply((o) => ({ ...o, strokeHidden: hide })) }}
            onRemove={() => apply((o) => ({ ...o, stroke: null }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <SideField label="Position">
              {(id) => (
                <SelectMenu id={id} value={position ?? ''} placeholder="Mixed" options={strokePositions} onChange={(v) => apply((o) => ({ ...o, strokePosition: v }))} />
              )}
            </SideField>
            <SideField label="Weight">
              {(id) => (
                <NumberField
                  id={id} value={weight ?? 1} mixed={weight === undefined} step={1}
                  format={(v) => String(Math.round(v * 10) / 10)} parse={(t) => parseFloat(String(t).replace(/[^0-9.]/g, ''))} clamp={(v) => Math.max(0, Math.min(200, Math.round(v * 10) / 10))}
                  leading={<WeightIcon className="size-4 text-fg-muted" />}
                  onBegin={session.begin} onEnd={session.end}
                  onPreview={(v) => preview((o) => (strokeOf(o).color ? { ...o, strokeWidth: v } : o))}
                />
              )}
            </SideField>
          </div>
        </>
      )}
    </Panel>
  )
}

/**
 * Text inside shapes: size (blank = auto-fit) and colour (auto = readable on the fill), plus the
 * WCAG check. The words themselves are typed on the canvas — Text tool + click the shape, or Enter.
 */
function ShapeTextPanel({ selected, objects, scene, canvasBackground, tierColor }) {
  const { session, common, preview, apply } = useSelectionEdit(selected, objects, scene)
  if (!selected.length) return null
  const single = selected.length === 1 ? selected[0] : null
  const size = common((o) => o.labelSize ?? null)
  const color = common((o) => o.labelColor ?? null)
  return (
    <Panel title="Text" className="border-b border-default">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <SideField label="Size">
            {(id) => (
              <TextInput
                id={id} inputMode="numeric" maxLength={3} autoComplete="off" className="tabular-nums"
                value={size == null ? '' : String(Math.round(size))}
                placeholder={size === undefined ? 'Mixed' : single ? `Auto (${Math.round(labelFontSize(single))})` : 'Auto'}
                onFocus={session.begin} onBlur={session.end}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9]/g, ''))
                  preview((o) => { const { labelSize: _s, ...rest } = o; return n >= 1 ? { ...rest, labelSize: Math.min(200, n) } : rest })
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
              />
            )}
          </SideField>
          <SideField label="Colour">
            {(id) => (
              <div className="flex h-10 items-center gap-2 rounded-md border border-default bg-surface px-2.75">
                <label className="relative block size-4 shrink-0 cursor-pointer overflow-hidden rounded-xs border border-black/10" style={{ backgroundColor: color ?? 'transparent', backgroundImage: color ? undefined : 'linear-gradient(135deg, #fff 45%, #f00 45%, #f00 55%, #fff 55%)' }}>
                  <span className="sr-only">Pick text colour</span>
                  <input
                    id={id} type="color" value={(color ?? '#000000').toLowerCase()}
                    onFocus={session.begin} onBlur={session.end}
                    onChange={(e) => preview((o) => ({ ...o, labelColor: e.target.value.toUpperCase() }))}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
                <span className="min-w-0 flex-1 truncate text-fg tabular-nums">{color === undefined ? 'Mixed' : color ? color.replace('#', '') : 'Auto'}</span>
                {color && (
                  <button type="button" onClick={() => apply((o) => { const { labelColor: _c, ...rest } = o; return rest })} className="cursor-pointer rounded-xs text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-primary/30" aria-label="Back to automatic colour" title="Auto">
                    <Minus aria-hidden className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </SideField>
        </div>
        <AlignmentField value={common((o) => o.labelAlign ?? 'center')} onChange={(v) => apply((o) => ({ ...o, labelAlign: v }))} />
        <ContrastCheck
          results={selected.map((o) => {
            const fill = effectiveFill(o, tierColor(o))
            return textContrast(
              { text: o.labelColor ?? autoLabelColor(fill), background: fill, fillOpacity: o.tierId ? 1 : o.fillOpacity ?? 1, opacity: objectOpacity(o) },
              canvasBackground,
              labelFontSize({ ...o, name: o.name || 'Label' }),
            )
          })}
        />
      </div>
    </Panel>
  )
}

/**
 * Figma-style WCAG check under a text colour: ratio, then the best level met (AAA / AA) or Fail.
 * Several selected → the lowest contrast among them.
 */
function ContrastCheck({ results }) {
  if (!results.length) return null
  const worst = results.reduce((a, b) => (b.ratio < a.ratio ? b : a))
  const pass = Boolean(worst.level)
  const need = worst.large ? '3:1 (AA) · 4.5:1 (AAA) for large text' : '4.5:1 (AA) · 7:1 (AAA)'
  return (
    <div
      className="flex h-8 items-center gap-2 rounded-md bg-neutral-100 px-2.5 text-caption text-fg dark:bg-surface-muted"
      title={`WCAG contrast — needs ${need}${results.length > 1 ? '. Showing the lowest of the selection.' : ''}`}
    >
      <Contrast aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      <span className="font-medium tabular-nums">{worst.ratio.toFixed(2)} : 1</span>
      <span className="sr-only">contrast ratio,</span>
      <span className={cn('ml-auto flex items-center gap-1 font-medium', pass ? 'text-fg' : 'text-danger-fg')}>
        {pass ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : <X aria-hidden className="size-3.5" strokeWidth={2.5} />}
        {pass ? worst.level : 'Fail'}
        {!pass && <span className="sr-only">— below WCAG AA</span>}
      </span>
    </div>
  )
}

function TextPanel({ object, objects, scene, canvasBackground }) {
  const session = useEditSession(scene, objects)
  const update = (patch) => scene.preview((list) => list.map((o) => {
    if (o.id !== object.id) return o
    const next = { ...o, ...patch }
    return { ...next, w: measureText(next.text, next.fontSize), h: next.fontSize * 1.25 }
  }))
  return (
    <Panel title="Text" className="border-b border-default">
      <div className="flex flex-col gap-4">
        <SideField label="Font Size">
          {(id) => (
            <TextInput
              id={id} value={String(Math.round(object.fontSize))} inputMode="numeric" maxLength={3} className="tabular-nums" autoComplete="off"
              onFocus={session.begin} onBlur={session.end}
              onChange={(e) => { const n = Number(digits(e.target.value)); if (n >= 1) update({ fontSize: n }) }}
            />
          )}
        </SideField>
        <AlignmentField
          value={object.textAlign ?? 'left'}
          onChange={(v) => scene.apply((list) => list.map((o) => (o.id === object.id ? { ...o, textAlign: v } : o)))}
        />
        {/* Free text sits on the canvas — checked against its background (colour is set in Fill) */}
        {object.fill !== null && !object.fillHidden && (
          <ContrastCheck
            results={[textContrast({ text: object.fill ?? '#0A0A0A', background: null, opacity: (object.fillOpacity ?? 1) * objectOpacity(object) }, canvasBackground, object.fontSize)]}
          />
        )}
      </div>
    </Panel>
  )
}


export default SelectionPanel
