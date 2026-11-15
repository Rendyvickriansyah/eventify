import { useCallback, useEffect, useReducer, useRef } from 'react'

/*
 * Scene objects with undo/redo.
 *  - apply(next)    — one undoable step (create, delete, assign, a panel edit)
 *  - preview(next)  — live update while dragging; nothing recorded yet
 *  - commit(base)   — end of a drag: records `base` (the scene before it) as one step
 * `next` may be a value or an updater. History keeps the last 100 steps.
 */
const LIMIT = 100

function reducer(state, action) {
  const resolve = (next) => (typeof next === 'function' ? next(state.present) : next)
  switch (action.type) {
    case 'apply': {
      const next = resolve(action.next)
      if (next === state.present) return state
      return { past: [...state.past.slice(-LIMIT + 1), state.present], present: next, future: [] }
    }
    case 'preview':
      return { ...state, present: resolve(action.next) }
    case 'commit':
      if (action.base === state.present) return state
      return { past: [...state.past.slice(-LIMIT + 1), action.base], present: state.present, future: [] }
    case 'undo':
      if (!state.past.length) return state
      return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] }
    case 'redo':
      if (!state.future.length) return state
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) }
    default:
      return state
  }
}

/**
 * @param {import('./geometry').SceneObject[]} initial
 * @param {(objects: import('./geometry').SceneObject[]) => void} onPersist  called 300ms after the last change
 */
export function useScene(initial, onPersist) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] })
  const persist = useRef(onPersist)
  persist.current = onPersist
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return undefined }
    const timer = setTimeout(() => persist.current(state.present), 300)
    return () => clearTimeout(timer)
  }, [state.present])

  return {
    objects: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply: useCallback((next) => dispatch({ type: 'apply', next }), []),
    preview: useCallback((next) => dispatch({ type: 'preview', next }), []),
    commit: useCallback((base) => dispatch({ type: 'commit', base }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    redo: useCallback(() => dispatch({ type: 'redo' }), []),
  }
}
