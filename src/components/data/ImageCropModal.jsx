import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { ImageUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/*
 * Upload + crop an image for a fixed-ratio slot (the e-voucher banner, 668 × 248).
 * Glass modal (the dropdown surface) with three phases:
 *   1. pick     — drop zone / browse; JPG, PNG or WebP up to 10MB
 *   2. upload   — file card with a progress bar; at 100% it turns green and a check draws in
 *   3. crop     — the whole image with a frame locked to the slot's ratio. Drag the frame to
 *                 choose what shows, drag a corner to resize it (ratio kept), or use the arrow
 *                 keys (Shift = bigger steps, +/- to resize). "Apply" renders the crop at 2×.
 *
 * The frame moves by writing styles directly (no React render per pointer move).
 */

const MAX_BYTES = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MIN_UPLOAD_MS = 900 // long enough to read as progress, short enough not to stall
const MIN_FRAME = 80
const STAGE_MAX_H = 360

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOutCubic = (t) => 1 - (1 - t) ** 3
const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

/**
 * @param {{ open: boolean, onClose: () => void, aspect: number, outputWidth?: number,
 *           initialFile?: File | null, onApply: (dataUrl: string) => void }} props
 */
export function ImageCropModal({ open, onClose, aspect, outputWidth = 1336, initialFile = null, onApply }) {
  const [phase, setPhase] = useState('pick') // pick | upload | crop
  const [file, setFile] = useState(null)
  const [source, setSource] = useState(null) // { url, img, width, height }
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const run = useRef(0) // invalidates an in-flight upload when the user starts over or closes

  const reset = useCallback(() => {
    run.current++
    setPhase('pick')
    setFile(null)
    setSource(null)
    setDone(false)
    setError('')
    setApplying(false)
  }, [])

  // Start fresh each time it opens; a file dropped on the slot skips straight to uploading.
  useEffect(() => {
    if (!open) return
    reset()
    if (initialFile) accept(initialFile)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function accept(next) {
    if (!next) return
    if (!TYPES.includes(next.type)) {
      setError('That file type isn’t supported. Use a JPG, PNG or WebP image.')
      return
    }
    if (next.size > MAX_BYTES) {
      setError(`That image is ${formatSize(next.size)}. Choose one under 10MB.`)
      return
    }
    setError('')
    setFile(next)
    setDone(false)
    setPhase('upload')
  }

  const startUpload = useCallback(async (fillEl, percentEl) => {
    const id = ++run.current
    const started = performance.now()
    const minMs = reducedMotion() ? 0 : MIN_UPLOAD_MS
    let loaded = null
    const loading = loadImage(file).then((r) => { loaded = r })

    // Progress runs to 90% over minMs, then finishes once the image has decoded.
    await new Promise((resolve) => {
      const tick = (now) => {
        if (id !== run.current) return resolve()
        const t = minMs ? Math.min(1, (now - started) / minMs) : 1
        const p = loaded && t >= 1 ? 1 : easeOutCubic(t) * 0.9
        if (fillEl) fillEl.style.transform = `scaleX(${p})`
        if (percentEl) percentEl.textContent = `${Math.round(p * 100)}%`
        if (p >= 1) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    try {
      await loading
    } catch {
      if (id !== run.current) return
      setPhase('pick')
      setError('We couldn’t read that image. Try exporting it again or choose another file.')
      return
    }
    if (id !== run.current) return
    setSource(loaded)
    setDone(true)
    // Let the "complete" state register before swapping to the cropper.
    setTimeout(() => { if (id === run.current) setPhase('crop') }, reducedMotion() ? 0 : 650)
  }, [file])

  const cropRef = useRef(null)

  async function apply() {
    if (!source || !cropRef.current) return
    setApplying(true)
    const { x, y, w, h } = cropRef.current.getCrop() // in source pixels
    const outW = Math.min(outputWidth, Math.round(w))
    const outH = Math.round(outW / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.img, x, y, w, h, 0, 0, outW, outH)
    onApply(canvas.toDataURL('image/jpeg', 0.85))
    onClose()
  }

  const close = () => {
    run.current++
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      variant="glass"
      size={phase === 'crop' ? 'lg' : 'md'}
      title={phase === 'crop' ? 'Adjust Image' : 'Upload Image'}
      footer={
        phase === 'crop' ? (
          <>
            <button
              type="button"
              onClick={reset}
              className="press mr-auto flex h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-label text-white/70 outline-none transition-[color,background-color,transform] duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-4 focus-visible:ring-white/20"
            >
              <RefreshCw aria-hidden className="size-4" />
              Replace image
            </button>
            <Button variant="secondary" className="h-10 rounded-lg px-4 font-medium" onClick={apply} loading={applying}>
              Apply to E-Voucher
            </Button>
          </>
        ) : null
      }
    >
      {phase === 'pick' && <DropZone onFile={accept} error={error} />}
      {phase === 'upload' && file && <UploadCard key={file.name + file.size} file={file} done={done} onStart={startUpload} />}
      {phase === 'crop' && source && (
        <Cropper ref={cropRef} source={source} aspect={aspect} />
      )}
    </Modal>
  )
}

/* ─── 1. Pick ─────────────────────────────────────────────────────────────── */

function DropZone({ onFile, error }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  return (
    <div className="flex flex-col gap-3 pb-6">
      <button
        type="button"
        data-autofocus
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]) }}
        data-over={over || undefined}
        aria-describedby={error ? 'crop-drop-error' : undefined}
        className="crop-drop flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-white/20 px-6 py-10 text-center outline-none focus-visible:ring-4 focus-visible:ring-white/20"
      >
        <span aria-hidden className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/10">
          <ImageUp className="size-5 text-white" strokeWidth={1.5} />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-label text-white">Drag and drop an image, or <span className="underline underline-offset-4">browse</span></span>
          <span className="text-body text-white/60">JPG, PNG or WebP · up to 10MB · wide images fit best</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }}
      />
      {error && (
        <p id="crop-drop-error" role="alert" className="text-body text-red-300">{error}</p>
      )}
    </div>
  )
}

/* ─── 2. Upload ───────────────────────────────────────────────────────────── */

function UploadCard({ file, done, onStart }) {
  const fillRef = useRef(null)
  const percentRef = useRef(null)
  const [thumb] = useState(() => URL.createObjectURL(file))

  useEffect(() => () => URL.revokeObjectURL(thumb), [thumb])
  useLayoutEffect(() => { onStart(fillRef.current, percentRef.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pb-6">
      <div
        data-done={done || undefined}
        className="upload-card flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
        role="status"
        aria-live="polite"
      >
        <img src={thumb} alt="" className="size-12 shrink-0 rounded-md bg-white/10 object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-label text-white" title={file.name}>{file.name}</p>
            <p className="shrink-0 text-body text-white/60 tabular-nums">
              {done ? 'Upload complete' : <><span ref={percentRef}>0%</span> · {formatSize(file.size)}</>}
            </p>
          </div>
          <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-white/10">
            <span ref={fillRef} className="upload-fill block h-full rounded-full bg-white" style={done ? { transform: 'scaleX(1)' } : undefined} />
          </span>
        </div>
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center">
          <svg viewBox="0 0 24 24" className="upload-check size-6" fill="none">
            <circle cx="12" cy="12" r="11" className="fill-green-500" />
            <path d="M7.5 12.5l3 3 6-6.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve({ url: reader.result, img, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/* ─── 3. Crop ─────────────────────────────────────────────────────────────── */

function Cropper({ ref, source, aspect }) {
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const box = useRef({ w: 0, h: 0, scale: 1 }) // displayed image size, display px per source px
  const frame = useRef(null) // { x, y, w } in display px; h = w / aspect
  const [, force] = useState(0)

  const paint = useCallback(() => {
    const el = frameRef.current
    const f = frame.current
    if (!el || !f) return
    el.style.transform = `translate(${f.x}px, ${f.y}px)`
    el.style.width = `${f.w}px`
    el.style.height = `${f.w / aspect}px`
  }, [aspect])

  const clamp = useCallback((f) => {
    const { w: bw, h: bh } = box.current
    const maxW = Math.min(bw, bh * aspect)
    const w = Math.min(maxW, Math.max(Math.min(MIN_FRAME, maxW), f.w))
    const h = w / aspect
    return { w, x: Math.min(bw - w, Math.max(0, f.x)), y: Math.min(bh - h, Math.max(0, f.y)) }
  }, [aspect])

  // Fit the image into the stage; keep the frame's relative position across resizes.
  useLayoutEffect(() => {
    const stage = stageRef.current
    const measure = () => {
      const avail = stage.clientWidth
      const scale = Math.min(avail / source.width, STAGE_MAX_H / source.height)
      const prev = box.current
      const next = { w: source.width * scale, h: source.height * scale, scale }
      box.current = next
      if (!frame.current) {
        // Start with the largest frame that fits, centred.
        const w = Math.min(next.w, next.h * aspect)
        frame.current = { w, x: (next.w - w) / 2, y: (next.h - w / aspect) / 2 }
      } else {
        const k = next.scale / prev.scale
        frame.current = clamp({ x: frame.current.x * k, y: frame.current.y * k, w: frame.current.w * k })
      }
      force((n) => n + 1)
      paint()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [source, aspect, clamp, paint])

  // Expose the crop rectangle in source pixels.
  useImperativeHandle(ref, () => ({
    getCrop: () => {
      const f = frame.current
      const s = box.current.scale
      return { x: f.x / s, y: f.y / s, w: f.w / s, h: f.w / aspect / s }
    },
  }), [aspect])

  function startDrag(e, corner) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const el = frameRef.current
    el.setPointerCapture(e.pointerId)
    el.dataset.dragging = ''
    const start = { ...frame.current }
    const px = e.clientX
    const py = e.clientY
    const h0 = start.w / aspect
    // For a resize, the opposite corner stays pinned.
    const anchor = corner && {
      x: corner.includes('l') ? start.x + start.w : start.x,
      y: corner.includes('t') ? start.y + h0 : start.y,
    }

    const move = (ev) => {
      const dx = ev.clientX - px
      const dy = ev.clientY - py
      if (!corner) {
        frame.current = clamp({ ...start, x: start.x + dx, y: start.y + dy })
      } else {
        const { w: bw, h: bh } = box.current
        const sx = corner.includes('l') ? -1 : 1
        const sy = corner.includes('t') ? -1 : 1
        // Follow whichever axis the pointer moved further along, keeping the ratio.
        let w = Math.max(start.w + sx * dx, (h0 + sy * dy) * aspect)
        const roomW = sx > 0 ? bw - anchor.x : anchor.x
        const roomH = sy > 0 ? bh - anchor.y : anchor.y
        w = Math.max(Math.min(MIN_FRAME, roomW), Math.min(w, roomW, roomH * aspect))
        const h = w / aspect
        frame.current = { w, x: sx > 0 ? anchor.x : anchor.x - w, y: sy > 0 ? anchor.y : anchor.y - h }
      }
      paint()
    }
    const end = () => {
      delete el.dataset.dragging
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }

  function onKeyDown(e) {
    const step = e.shiftKey ? 20 : 4
    const f = frame.current
    let next = null
    if (e.key === 'ArrowLeft') next = { ...f, x: f.x - step }
    else if (e.key === 'ArrowRight') next = { ...f, x: f.x + step }
    else if (e.key === 'ArrowUp') next = { ...f, y: f.y - step }
    else if (e.key === 'ArrowDown') next = { ...f, y: f.y + step }
    else if (e.key === '+' || e.key === '=' || e.key === '-') {
      // resize around the centre
      const d = (e.key === '-' ? -1 : 1) * step * 2
      const cx = f.x + f.w / 2
      const cy = f.y + f.w / aspect / 2
      const w = f.w + d
      next = { w, x: cx - w / 2, y: cy - w / aspect / 2 }
    }
    if (!next) return
    e.preventDefault()
    frame.current = clamp(next)
    paint()
  }

  const { w: bw, h: bh } = box.current

  return (
    <div className="crop-in flex flex-col gap-3 pb-2">
      <div ref={stageRef} className="flex w-full justify-center">
        <div
          className="relative touch-none overflow-hidden rounded-md bg-black/40 select-none"
          style={{ width: bw || undefined, height: bh || undefined }}
        >
          <img src={source.url} alt="" draggable={false} className="pointer-events-none block size-full" />
          <div
            ref={frameRef}
            role="group"
            tabIndex={0}
            aria-label="Crop area. Drag to move, drag a corner to resize. Arrow keys move it; plus and minus resize it."
            onPointerDown={(e) => startDrag(e, null)}
            onKeyDown={onKeyDown}
            className="crop-frame absolute top-0 left-0 cursor-move outline-none shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] ring-1 ring-white focus-visible:ring-2"
          >
            {/* rule-of-thirds grid */}
            <span aria-hidden className="crop-grid pointer-events-none absolute inset-0">
              <span className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
              <span className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
              <span className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
              <span className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
            </span>
            {['tl', 'tr', 'bl', 'br'].map((c) => (
              <span
                key={c}
                aria-hidden
                onPointerDown={(e) => startDrag(e, c)}
                className={cn(
                  // L-shaped corner bracket drawn inside the frame (the stage clips anything
                  // outside it); 18px mark, 30px hit area that also reaches into the frame
                  'absolute size-4.5 border-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.4)]',
                  'before:absolute before:-inset-1.5 before:content-[""]',
                  c[0] === 't' ? 'top-0 border-t-[3px]' : 'bottom-0 border-b-[3px]',
                  c[1] === 'l' ? 'left-0 border-l-[3px]' : 'right-0 border-r-[3px]',
                  c === 'tl' || c === 'br' ? 'cursor-nwse-resize' : 'cursor-nesw-resize',
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-body text-white/60">
        Drag the frame to choose what shows on the voucher · drag a corner to resize
      </p>
    </div>
  )
}

export default ImageCropModal
