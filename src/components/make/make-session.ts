const KEY = "ctoti.makeSession"

export type MakeSession<Look> = {
  original: string
  originalSize: { width: number; height: number } | null
  look: Look
}

/** Survives leaving Make for print or the wall; sessionStorage may be too small for big photos. */
let memory: MakeSession<unknown> | null = null

export function stashMakeSession<Look>(session: MakeSession<Look>) {
  memory = session
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    sessionStorage.removeItem(KEY)
  }
}

export function readMakeSession<Look>(): MakeSession<Look> | null {
  if (memory) return memory as MakeSession<Look>
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as MakeSession<Look>
    if (typeof value?.original !== "string" || !value.look) return null
    if (!value.original.startsWith("data:image/")) return null
    memory = value
    return value
  } catch {
    return null
  }
}

export function clearMakeSession() {
  memory = null
  sessionStorage.removeItem(KEY)
}
