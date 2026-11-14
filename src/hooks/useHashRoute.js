import { useSyncExternalStore } from 'react'

/** Returns the current `#/route` id (e.g. "dashboard"), falling back to `fallback`. */
export function useHashRoute(fallback) {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange)
      return () => window.removeEventListener('hashchange', onChange)
    },
    () => window.location.hash,
    () => '',
  )
  return hash.replace(/^#\/?/, '') || fallback
}

export default useHashRoute
