import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { WizardShell, useWizardEffects } from '@/components/layout/Wizard'
import { Button } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { toast } from '@/components/ui/Toast'
import { ImageCropModal } from '@/components/data/ImageCropModal'
import { addVoucher, updateVoucher, getVouchers, demoVouchers } from '@/data/voucherStore'
import boldIcon from '@/assets/icons/voucher-editor/bold.svg'
import italicIcon from '@/assets/icons/voucher-editor/italic.svg'
import underlineIcon from '@/assets/icons/voucher-editor/underline.svg'
import numberedIcon from '@/assets/icons/voucher-editor/numbered-list.svg'
import bulletIcon from '@/assets/icons/voucher-editor/bullet-list.svg'
import increaseIcon from '@/assets/icons/voucher-editor/text-increase.svg'
import decreaseIcon from '@/assets/icons/voucher-editor/text-decrease.svg'
import fileCodeIcon from '@/assets/icons/voucher-editor/file-code.svg'
import dotIcon from '@/assets/icons/voucher-editor/dot.svg'
import calendarIcon from '@/assets/icons/voucher-editor/calendar.svg'
import ticketIcon from '@/assets/icons/voucher-editor/ticket.svg'
import banknoteIcon from '@/assets/icons/voucher-editor/banknote-x.svg'
import phoneIcon from '@/assets/icons/voucher-editor/phone.svg'
import whatsappIcon from '@/assets/icons/voucher-editor/whatsapp.svg'
import emailIcon from '@/assets/icons/voucher-editor/email.svg'
import imageBg from '@/assets/illustrations/voucher-image-bg.png'
import imagePlaceholder from '@/assets/illustrations/voucher-image-placeholder.png'

/*
 * E-voucher editor — Figma "Create New E-Voucher" / Step 1 (node 305:29728). Full-screen
 * WizardShell: 72px header with the round close button, an 80px formatting sidebar (24px
 * icons 48px apart), the 700px voucher on a grey canvas, and "Create E-Voucher" bottom-right.
 *
 * The voucher is a document: its text is editable in place (contentEditable regions) and the
 * sidebar formats the selection — bold, italic, underline, numbered/bulleted lists, text
 * size ±, insert a $variable, and text colour. `$variables` are filled per order when the
 * voucher is sent. Routes: #/event/:id/vouchers/new and #/event/:id/vouchers/:voucherId
 * (Manage). Saving returns to the E-Voucher list with a toast.
 */

const icon = (src, size = 16) => `<img src="${src}" alt="" width="${size}" height="${size}" class="size-4 shrink-0" />`
const tag = (text) => `<span class="inline-flex h-7 items-center rounded-xs border border-default bg-white px-1.5">${text}</span>`
const includedRow = (title, qty, name, price) => `
  <div class="flex items-center">
    <p class="w-37.5 shrink-0">${title}</p>
    <div class="flex min-w-0 flex-1 items-center">
      <div class="w-33 shrink-0">${tag(qty)}</div>
      <p class="min-w-0 flex-1">${name}</p>
      <p class="shrink-0 text-right">${price}</p>
    </div>
  </div>`
const visitorRow = (label, value) => `<div class="flex"><p class="w-37.5 shrink-0">${label}</p><p>: ${value}</p></div>`
const iconItem = (src, text) => `<p class="flex items-center gap-3">${icon(src)}<span>${text}</span></p>`

const defaultDesign = {
  title: 'Events e-voucher',
  meta: `$order_id ${icon(dotIcon)} $order_timestamp`,
  body: `
<div class="flex items-center justify-between gap-6 p-4">
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <p class="text-body-lg font-semibold">$event_name</p>
    <p>$ticket_category</p>
  </div>
  <p class="shrink-0 whitespace-nowrap text-right">1 Ticket of $total_ticket</p>
</div>
<div class="flex flex-col gap-3 border-y border-dashed border-default p-4">
  <p class="font-semibold">What’s Included</p>
  <div class="flex flex-col gap-4">
    ${includedRow('Ticket(s)', '$total_ticket', '$ticket_category', '$ticket_price')}
    ${includedRow('Meal Package', '$meal_qty', '$meal_name', '$meal_total_price')}
    ${includedRow('Parking Pass', '$parking_qty', '$parking_vehicle_type', '$parking_total_price')}
    ${includedRow('Merch Bundle', '$merch_qty', '$merch_name', '$merch_total_price')}
  </div>
</div>
<div class="flex items-center justify-between gap-4 px-4 py-5">
  ${iconItem(calendarIcon, 'Valid on $event_date')}
  ${iconItem(ticketIcon, 'Instant Confirmation')}
  ${iconItem(banknoteIcon, 'Refund not allowed')}
</div>
<div class="flex flex-col gap-3 border-y border-dashed border-default p-4">
  <p class="font-semibold">Visitor Details - Ticket 1 (PAX)</p>
  <div class="flex flex-col gap-4">
    ${visitorRow('Full Name', 'Mr/Ms $full_name')}
    ${visitorRow('Email Address', '$email_address')}
    ${visitorRow('Mobile Number', '$mobile_phone_number')}
    ${visitorRow('ID Number', '$id_number')}
  </div>
</div>
<div class="flex flex-col gap-3 border-b border-dashed border-default p-4">
  <p class="font-semibold">Important Info</p>
  <ul class="list-inside list-disc pl-0">
    <li>Present this e-voucher at the $redemption_location upon arrival.</li>
    <li>This voucher is valid for $event_date only.</li>
    <li>Show your QR code or ticket number to the staff for verification.</li>
    <li>Each voucher can only be redeemed once and is non-transferable.</li>
    <li>Lost or damaged vouchers will not be replaced.</li>
  </ul>
</div>
<div class="flex items-center justify-between gap-4 px-4 py-5">
  ${iconItem(phoneIcon, '(+1) 12345678')}
  ${iconItem(whatsappIcon, '(+1) 12345678')}
  ${iconItem(emailIcon, 'customerservice@platform.com')}
</div>`,
  image: null,
}

const variables = [
  ['Event', ['$event_name', '$event_date', '$redemption_location']],
  ['Ticket', ['$ticket_category', '$ticket_price', '$total_ticket']],
  ['Order', ['$order_id', '$order_timestamp']],
  ['Visitor', ['$full_name', '$email_address', '$mobile_phone_number', '$id_number']],
]

const formatTools = [
  { id: 'bold', label: 'Bold', icon: boldIcon, command: 'bold', shortcut: 'B' },
  { id: 'italic', label: 'Italic', icon: italicIcon, command: 'italic', shortcut: 'I' },
  { id: 'underline', label: 'Underline', icon: underlineIcon, command: 'underline', shortcut: 'U' },
  { id: 'ol', label: 'Numbered list', icon: numberedIcon, command: 'insertOrderedList' },
  { id: 'ul', label: 'Bulleted list', icon: bulletIcon, command: 'insertUnorderedList' },
]

/** Figma "Image Container" content box: 668 × 248. */
const IMAGE_ASPECT = 668 / 248
const MIN_SIZE = 10
const MAX_SIZE = 32

/**
 * @param {{ eventId: string, voucherId: string | null }} props
 */
export function VoucherEditor({ eventId, voucherId }) {
  const listHref = `#/event/${eventId}/vouchers`
  const [source] = useState(() => {
    const stored = voucherId && getVouchers(eventId).find((v) => v.id === voucherId)
    if (stored) return { mode: 'edit', voucher: stored, design: { ...defaultDesign, title: stored.name, ...stored.design } }
    const demo = voucherId && demoVouchers[eventId]?.find((v) => v.id === voucherId)
    return { mode: 'create', voucher: null, design: { ...defaultDesign, title: demo?.name ?? defaultDesign.title } }
  })

  const formRef = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const metaRef = useRef(null)
  const bodyRef = useRef(null)
  const savedRange = useRef(null)

  const [image, setImage] = useState(source.design.image)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [titleInvalid, setTitleInvalid] = useState(false)
  const [active, setActive] = useState({}) // command → on, for aria-pressed
  const [color, setColor] = useState('#155dfc') // Figma colour swatch (blue/600)
  // Upload → crop happens in ImageCropModal; the slot only receives the finished crop.
  const [uploading, setUploading] = useState({ open: false, file: null })

  // No autofocus: the page opens clean (no caret, no toolbar on-states); the footer says to click text.
  useWizardEffects({ step: 0, formRef, attempt, dirty: dirty && !saving })

  // Remember the last selection inside the voucher, so the colour picker and the variable menu
  // (which take focus) can still apply to it; also reflect the formatting under the caret.
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = document.getSelection()
      const inVoucher = canvasRef.current?.contains(document.activeElement)
      if (!sel?.rangeCount || !inVoucher || !canvasRef.current.contains(sel.anchorNode)) {
        setActive((prev) => (Object.keys(prev).length ? {} : prev))
        return
      }
      savedRange.current = sel.getRangeAt(0).cloneRange()
      setActive(Object.fromEntries(formatTools.map((t) => [t.command, safeState(t.command)])))
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  const markDirty = useCallback(() => setDirty(true), [])

  function restoreSelection() {
    const range = savedRange.current
    if (!range) return false
    const region = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement)?.closest('[contenteditable="true"]')
    if (!region) return false
    region.focus({ preventScroll: true })
    const sel = document.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  function exec(command, value) {
    if (!restoreSelection()) return
    document.execCommand('styleWithCSS', false, command === 'foreColor')
    document.execCommand(command, false, value)
    markDirty()
    setActive(Object.fromEntries(formatTools.map((t) => [t.command, safeState(t.command)])))
  }

  function resize(delta) {
    if (!restoreSelection()) return
    const sel = document.getSelection()
    if (sel.isCollapsed) {
      toast.info('Select some text first', { description: 'Then use A+ or A− to change its size.' })
      return
    }
    const range = sel.getRangeAt(0)
    const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement
    const current = parseFloat(getComputedStyle(start).fontSize)
    const next = Math.min(MAX_SIZE, Math.max(MIN_SIZE, current + delta))
    const span = document.createElement('span')
    span.style.fontSize = `${next}px`
    span.style.lineHeight = '1.4'
    span.appendChild(range.extractContents())
    range.insertNode(span)
    const fresh = document.createRange()
    fresh.selectNodeContents(span)
    sel.removeAllRanges()
    sel.addRange(fresh)
    savedRange.current = fresh.cloneRange()
    markDirty()
  }

  function insertVariable(name) {
    if (!restoreSelection()) {
      toast.info('Click into the voucher first', { description: 'The variable is inserted where your cursor is.' })
      return
    }
    document.execCommand('insertText', false, name)
    markDirty()
  }

  function close() {
    if (dirty && !window.confirm('Discard this e-voucher? Your changes will be lost.')) return
    window.location.hash = listHref
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    const name = titleRef.current.textContent.replace(/\s+/g, ' ').trim()
    if (!name) {
      setTitleInvalid(true)
      setAttempt((n) => n + 1)
      titleRef.current.focus()
      toast.error('Give your e-voucher a title', { description: 'The heading at the top of the voucher names this template.' })
      return
    }
    setSaving(true)
    const design = { title: titleRef.current.innerHTML, meta: metaRef.current.innerHTML, body: bodyRef.current.innerHTML, image }
    // Short pause so the button's saving state reads as work happening (stand-in for the API).
    setTimeout(() => {
      try {
        if (source.mode === 'edit') updateVoucher(eventId, source.voucher.id, { name, design })
        else addVoucher(eventId, { name, design })
      } catch {
        setSaving(false)
        toast.error('Could not save the e-voucher', { description: 'Browser storage is full or unavailable. Try a smaller image, or free up space.' })
        return
      }
      window.location.hash = listHref
      if (source.mode === 'edit') toast.success('E-Voucher Updated', { description: `Changes to “${name}” are saved.` })
      else toast.success('E-Voucher Created Successfully', { description: `“${name}” is ready to attach to your ticket types.` })
    }, 500)
  }

  return (
    <WizardShell
      title={source.mode === 'edit' ? 'Edit E-Voucher' : 'Create New E-Voucher'}
      onClose={close}
      closeLabel="Close editor"
      closeVariant="round"
      fullBleed
      formId="voucher-editor"
      formRef={formRef}
      onSubmit={handleSubmit}
      note={dirty ? 'Unsaved changes' : 'Click any text on the voucher to edit it.'}
      submitLabel={source.mode === 'edit' ? 'Save Changes' : 'Create E-Voucher'}
      busy={saving}
      busyLabel="Saving…"
    >
      {/* Sidebar — Figma 80px column of 24px icons; grouped (format · lists · size · insert),
          scrolls on short screens, becomes a horizontal bar on mobile */}
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-default bg-surface px-4 py-2 md:w-20 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:px-5 md:py-4"
      >
        {formatTools.slice(0, 3).map((tool) => (
          <ToolButton
            key={tool.id}
            label={tool.shortcut ? `${tool.label} (Ctrl+${tool.shortcut})` : tool.label}
            pressed={!!active[tool.command]}
            onClick={() => exec(tool.command)}
          >
            <img src={tool.icon} alt="" width="24" height="24" className="block size-6" />
          </ToolButton>
        ))}
        <ToolSeparator />
        {formatTools.slice(3).map((tool) => (
          <ToolButton key={tool.id} label={tool.label} pressed={!!active[tool.command]} onClick={() => exec(tool.command)}>
            <img src={tool.icon} alt="" width="24" height="24" className="block size-6" />
          </ToolButton>
        ))}
        <ToolSeparator />
        <ToolButton label="Increase text size" onClick={() => resize(2)}>
          <img src={increaseIcon} alt="" width="17.6001" height="12" className="block h-3 w-[17.6px]" />
        </ToolButton>
        <ToolButton label="Decrease text size" onClick={() => resize(-2)}>
          <img src={decreaseIcon} alt="" width="18" height="12" className="block h-3 w-4.5" />
        </ToolButton>
        <ToolSeparator />
        <span onMouseDown={(e) => e.preventDefault()} className="contents">
          <Menu
            label="Insert variable"
            icon={fileCodeIcon}
            align="start"
            className="voucher-tool size-10 shrink-0 [&_img]:size-6"
            items={variables.map(([group, names]) => ({
              id: group,
              label: group,
              items: names.map((n) => ({ id: n, label: n, onSelect: () => insertVariable(n) })),
            }))}
          />
        </span>
        <label
          title="Text colour"
          onMouseDown={() => {
            // keep the selection: the native picker takes focus
            const sel = document.getSelection()
            if (sel?.rangeCount && canvasRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange()
          }}
          className="voucher-tool relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md has-focus-visible:ring-4 has-focus-visible:ring-primary/20"
        >
          <span aria-hidden className="size-6 rounded-xs border border-black/10" style={{ backgroundColor: color }} />
          <input
            type="color"
            aria-label="Text colour"
            value={color}
            onChange={(e) => {
              setColor(e.target.value)
              exec('foreColor', e.target.value)
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      {/* Canvas — the 700px voucher centred on grey, 32px from the top */}
      <div className="min-h-0 flex-1 overflow-auto bg-gray-50 px-4 py-8 dark:bg-surface-muted">
        <article
          ref={canvasRef}
          aria-label="E-voucher preview"
          onBlur={(e) => {
            // leaving the voucher (not just moving between its regions) clears the toolbar's on-states
            if (!e.currentTarget.contains(e.relatedTarget)) setActive({})
          }}
          className="voucher-doc enter-rise mx-auto flex w-175 flex-col rounded-lg border border-black/8 bg-white text-body text-black shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_-4px_rgb(0_0_0/0.06)]"
        >
          <header className="flex flex-col gap-1 p-4">
            <Region
              regionRef={titleRef}
              html={source.design.title}
              label="Voucher title"
              singleLine
              invalid={titleInvalid}
              onInput={() => {
                markDirty()
                if (titleInvalid && titleRef.current.textContent.trim()) setTitleInvalid(false)
              }}
              className="text-body-lg font-semibold"
            />
            <Region regionRef={metaRef} html={source.design.meta} label="Order reference" singleLine onInput={markDirty} className="flex items-center gap-1" />
          </header>

          <ImageSlot image={image} onOpen={(file = null) => setUploading({ open: true, file })} />
          <ImageCropModal
            open={uploading.open}
            initialFile={uploading.file}
            aspect={IMAGE_ASPECT}
            onClose={() => setUploading((u) => ({ ...u, open: false }))}
            onApply={(dataUrl) => {
              setImage(dataUrl)
              markDirty()
            }}
          />

          <Region regionRef={bodyRef} html={source.design.body} label="Voucher details" onInput={markDirty} className="flex flex-col" />
        </article>
      </div>
    </WizardShell>
  )
}

function safeState(command) {
  try {
    return document.queryCommandState(command)
  } catch {
    return false
  }
}

/** Hairline between tool groups (format · lists · size · insert). */
function ToolSeparator() {
  return <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-black/10 md:mx-0 md:my-2 md:h-px md:w-6 dark:bg-white/10" />
}

/** Sidebar button: keeps the text selection (mousedown) and shows its on-state. */
function ToolButton({ label, pressed, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="voucher-tool flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-4 focus-visible:ring-primary/20 aria-pressed:bg-surface-muted dark:[&_img]:invert"
    >
      {children}
    </button>
  )
}

/**
 * contentEditable region. Uncontrolled: React sets its HTML once on mount and never again,
 * so the caret isn't reset while typing; the saved HTML is read from the DOM on submit.
 */
function Region({ regionRef, html, label, singleLine = false, invalid = false, onInput, className }) {
  useLayoutEffect(() => {
    regionRef.current.innerHTML = html
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- seed once

  return (
    <div
      ref={regionRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      aria-multiline={!singleLine}
      aria-invalid={invalid || undefined}
      spellCheck
      onInput={onInput}
      onKeyDown={singleLine ? (e) => e.key === 'Enter' && e.preventDefault() : undefined}
      onPaste={(e) => {
        // paste as plain text so foreign styles don't leak into the voucher
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
      className={cn('voucher-region rounded-xs', className)}
    />
  )
}

/**
 * Figma "Image Container": 280px (16px padding), 248px rounded box, "Upload Image" top-right.
 * The button (or a file dropped on the box) opens the upload & crop modal.
 */
function ImageSlot({ image, onOpen }) {
  const [over, setOver] = useState(false)

  return (
    <div className="h-70 p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          onOpen(e.dataTransfer.files?.[0] ?? null)
        }}
        className={cn('relative h-62 overflow-hidden rounded-lg border border-default bg-gray-100 transition-[border-color] duration-150', over && 'border-blue-600')}
      >
        {image ? (
          <img key={image.length} src={image} alt="Voucher banner" className="voucher-image-in absolute inset-0 size-full object-cover" />
        ) : (
          <div aria-hidden>
            <img src={imageBg} alt="" className="absolute inset-0 size-full object-cover" />
            <img src={imagePlaceholder} alt="" className="absolute inset-0 size-full object-cover" />
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpen()}
          className="absolute top-4.75 right-4.75 h-9 rounded-lg px-3 text-shadow-button"
        >
          {image ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  )
}

export default VoucherEditor
