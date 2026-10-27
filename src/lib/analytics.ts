import type { MouseEvent } from "react"

/**
 * Umami gets pageviews (automatic, client-side navigation included) and the
 * named events below; it's for us. The public visitor and click counters are
 * our own beacons, counted in Postgres by `src/lib/visits.ts`.
 */

export type VisitSource =
  | "list"
  | "featured"
  | "related"
  | "detail"
  | "peel"
  | "wall"

type EventData = {
  sticker_visit: { slug: string; source: VisitSource }
  make_upload: undefined
  make_download: { style: string }
  make_print: { style: string }
  make_put_on_wall: { style: string }
  place_published: { units: string; price: number; moved: boolean }
  signup_completed: undefined
  promo_code_copied: { slug: string }
  share_clicked: { slug: string }
  print_sheet_saved: { copies: number }
  sticker_reported: { reason: string }
}

type EventName = keyof EventData

declare global {
  interface Window {
    umami?: {
      track: (
        event: string,
        data?: Record<string, string | number | boolean>
      ) => void
    }
  }
}

export function track<E extends EventName>(
  event: E,
  ...[data]: EventData[E] extends undefined ? [] : [EventData[E]]
): void {
  if (typeof window === "undefined") return
  window.umami?.track(event, data)
}

/** Survives the page unloading, unlike a plain fetch. */
function beacon(path: string) {
  if (typeof navigator === "undefined") return
  if (!navigator.sendBeacon?.(path)) {
    void fetch(path, { method: "POST", keepalive: true }).catch(() => {})
  }
}

/** Public visitor counter (ours, not Umami). Once per full page load. */
export function recordPageVisit() {
  if (/^\/admin(\/|$)/.test(window.location.pathname)) return
  beacon("/api/stats/visit")
}

type VisitTarget = { id: string; slug: string }

/** Counts a click-through on the sticker's public click counter. */
function countClick(sticker: VisitTarget) {
  beacon(`/api/stickers/${encodeURIComponent(sticker.id)}/click`)
}

/** Outbound visit from code, e.g. peeling the sticker off. */
export function trackVisit(sticker: VisitTarget, source: VisitSource) {
  countClick(sticker)
  track("sticker_visit", { slug: sticker.slug, source })
}

/**
 * Props for an outbound link. Umami records the click from the data
 * attributes; the handlers bump the public counter, middle-clicks included.
 */
export function visitLink(sticker: VisitTarget, source: VisitSource) {
  return {
    "data-umami-event": "sticker_visit",
    "data-umami-event-slug": sticker.slug,
    "data-umami-event-source": source,
    onClick: () => countClick(sticker),
    onAuxClick: (event: MouseEvent) => {
      if (event.button === 1) countClick(sticker)
    },
  }
}
