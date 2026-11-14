import { useEffect } from 'react'

/**
 * Calls `onDismiss` on Escape or on a pointer-down outside `ref` while `active`.
 * Pass an array of refs when part of the UI is portalled (e.g. a popover in document.body).
 * @param {React.RefObject<HTMLElement> | React.RefObject<HTMLElement>[]} ref
 * @param {boolean} active
 * @param {() => void} onDismiss
 */
export function useDismiss(ref, active, onDismiss) {
  useEffect(() => {
    if (!active) return
    const onPointer = (e) => {
      const refs = Array.isArray(ref) ? ref : [ref]
      if (refs.some((r) => r.current) && !refs.some((r) => r.current?.contains(e.target))) onDismiss()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active, onDismiss])
}

export default useDismiss
