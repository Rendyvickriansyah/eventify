import { useId, useRef, useState } from 'react'
import { CircleAlert, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { OptionalTag } from './Field'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png']

/**
 * Figma "Upload File" / "_base upload file": bordered drop area (40px vertical padding), 28px
 * image tile, "Drag and drop an image or" + format hint, and optionally a "Select Image" button
 * (Figma "Add Image" in Setup New Add-ons). Click, keyboard or drop to pick a file. The image is
 * downscaled before it's handed back, so it fits in localStorage.
 *
 * Motion: the tile lifts while a file is dragged over (`.dropzone`); the preview pops in.
 *
 * @param {{ label: string, value: { src: string, name: string } | null,
 *           onChange: (value: { src: string, name: string } | null) => void,
 *           optional?: boolean, selectButton?: boolean }} props
 */
export function ImageUpload({ label, value, onChange, optional = false, selectButton = false }) {
  const inputRef = useRef(null)
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const browse = () => inputRef.current?.click()

  async function accept(file) {
    if (!file) return
    if (!ACCEPT.includes(file.type)) return setError(`“${file.name}” isn't a JPG or PNG. Choose a JPG, PNG or JPEG image.`)
    if (file.size > MAX_BYTES) return setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Choose one up to 10MB.`)
    setError('')
    setBusy(true)
    try {
      onChange({ src: await downscale(file), name: file.name })
    } catch {
      setError('We couldn’t read that image. Try exporting it again or choose another file.')
    } finally {
      setBusy(false)
    }
  }

  const title = busy ? 'Preparing your image…' : dragging ? 'Drop the image to upload' : selectButton ? 'Drag and drop an image or' : 'Drag and drop an image or click to browse'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="text-label text-fg">{label}</span>
        {optional && <OptionalTag />}
      </div>
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files?.[0]) }}
        data-dragging={dragging || undefined}
        className={cn(
          'dropzone relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-md border border-default transition-[border-color,background-color] duration-150 ease-out',
          value ? 'p-2' : 'py-10 hover:border-strong',
          dragging && 'border-primary bg-primary-subtle',
          error && !dragging && 'border-danger',
        )}
      >
        {value ? (
          <div key={value.src} className="seat-card-in flex w-full items-center gap-4">
            <img src={value.src} alt={`${label} preview`} className="h-20 w-36 shrink-0 rounded-sm object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-label text-fg">{value.name}</p>
              <p className="text-caption text-fg-muted">{dragging ? 'Drop to replace' : 'Drop another image here to replace it'}</p>
            </div>
            <div className="flex shrink-0 gap-2 pr-2">
              <Button type="button" variant="secondary" size="sm" onClick={browse}>Replace</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Remove ${value.name}`}>Remove</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={browse}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-hint`}
              disabled={busy}
              className="group flex cursor-pointer flex-col items-center gap-3 rounded-md outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-4 focus-visible:after:ring-primary/20"
            >
              <span className="dropzone-tile flex size-7 items-center justify-center rounded-md border border-default bg-control shadow-control">
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin text-fg-muted" /> : <ImageIcon aria-hidden className="size-4 text-fg" strokeWidth={1.5} />}
              </span>
              <span className="flex flex-col items-center gap-1 text-caption lg:text-body">
                <span className="font-medium text-fg">{title}</span>
                <span id={`${id}-hint`} className="text-gray-800 dark:text-fg-muted">JPG, PNG, or JPEG files up to 10MB</span>
              </span>
            </button>
            {/* Visual button only — the whole zone above is the real control (no duplicate tab stop). */}
            {selectButton && (
              <span aria-hidden className="pointer-events-none relative">
                <Button as="span" variant="secondary" size="sm" tabIndex={-1}>Select Image</Button>
              </span>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {error && (
        <p role="alert" className="field-message flex items-start gap-1.5 text-body text-danger-fg">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

/** Resize to ≤ 1200px wide and re-encode as JPEG (~100–200KB) for localStorage. */
/** Reads an image file and re-encodes it as a JPEG data URL no wider than `maxWidth`. */
export async function downscale(file, maxWidth = 1200) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default ImageUpload
