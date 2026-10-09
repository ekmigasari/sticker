import { useCallback, useRef, useState } from "react"

const LIMIT = 60
/** Slider drags within this window collapse into one undo step. */
const MERGE_MS = 700

type History<T> = { past: T[]; present: T; future: T[] }

function shallowEqual<T extends object>(a: T, b: T) {
  return (Object.keys(a) as (keyof T)[]).every((k) => Object.is(a[k], b[k]))
}

/** Editor state with undo / redo. */
export function useEditHistory<T extends object>(initial: T) {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  })
  const last = useRef<{ key: string; at: number } | null>(null)

  const update = useCallback(
    (patch: Partial<T>, options?: { merge?: boolean }) => {
      const key = Object.keys(patch).sort().join(",")
      const now = performance.now()
      const merge =
        options?.merge === true &&
        last.current?.key === key &&
        now - last.current.at < MERGE_MS
      last.current = options?.merge ? { key, at: now } : null
      setHistory((h) => {
        const present = { ...h.present, ...patch }
        if (shallowEqual(present, h.present)) return h
        return {
          past: merge ? h.past : [...h.past, h.present].slice(-LIMIT),
          present,
          future: [],
        }
      })
    },
    []
  )

  const undo = useCallback(() => {
    last.current = null
    setHistory((h) => {
      const previous = h.past.at(-1)
      if (!previous) return h
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    last.current = null
    setHistory((h) => {
      const [next, ...future] = h.future
      if (!next) return h
      return { past: [...h.past, h.present], present: next, future }
    })
  }, [])

  /** Replaces the state and forgets history, e.g. for a new photo. */
  const reset = useCallback((next: (present: T) => T) => {
    last.current = null
    setHistory((h) => ({ past: [], present: next(h.present), future: [] }))
  }, [])

  return {
    state: history.present,
    update,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
