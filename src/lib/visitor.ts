/** Calendar day (`YYYY-MM-DD`) in `timeZone`; "today" for visitor stats. */
export function statsDay(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
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
