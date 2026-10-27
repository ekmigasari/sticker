/** Calendar day (`YYYY-MM-DD`) in `timeZone`; "today" for visitor stats. */
export function statsDay(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** `YYYY-MM-DD` moved by whole days. */
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export type VisitorPoint = {
  day: string
  visitors: number
  /** All-time visitors up to and including this day. */
  total: number
}

/** The `days` calendar days ending `today`; days without a row count as 0. */
export function visitorSeries(
  rows: ReadonlyArray<{ day: string; visitors: number }>,
  today: string,
  days: number,
  allTime: number
): VisitorPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r.visitors]))
  const dates = Array.from({ length: days }, (_, i) =>
    shiftDay(today, i - days + 1)
  )
  const inRange = dates.reduce((sum, d) => sum + (byDay.get(d) ?? 0), 0)
  let total = allTime - inRange
  return dates.map((day) => {
    const visitors = byDay.get(day) ?? 0
    total += visitors
    return { day, visitors, total }
  })
}

const BOT_UA =
  /bot|crawl|spider|slurp|scrape|preview|headless|lighthouse|facebookexternalhit|curl|wget|python|go-http|java\/|okhttp/i

export function isBot(userAgent: string): boolean {
  return BOT_UA.test(userAgent)
}

/**
 * Anonymous visitor id, the cookieless way Umami and Plausible do it: the salt
 * changes every day, so the same person can't be linked across days and the
 * IP is never stored.
 */
export async function hashVisitor(input: {
  secret: string
  day: string
  ip: string
  userAgent: string
}): Promise<string> {
  const bytes = new TextEncoder().encode(
    [input.secret, input.day, input.ip, input.userAgent].join("|")
  )
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return Array.from(digest.slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")
}
