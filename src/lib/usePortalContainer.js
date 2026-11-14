import { useLayoutEffect, useState } from 'react'

/**
 * Where a popover anchored to `ref` should portal to: the nearest open <dialog> if the anchor
 * lives inside one, otherwise document.body.
 *
 * A modal <dialog> (showModal) sits in the browser's top layer and makes everything outside it
 * inert — a popover portalled to <body> would render behind the dialog and ignore clicks.
 *
 * @param {React.RefObject<HTMLElement>} ref
 */
export function usePortalContainer(ref) {
  const [container, setContainer] = useState(() => (typeof document === 'undefined' ? null : document.body))
  useLayoutEffect(() => {
    setContainer(ref.current?.closest('dialog') ?? document.body)
  }, [ref])
  return container
}

export default usePortalContainer
