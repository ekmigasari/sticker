import { prisma } from "@/lib/prisma"

/**
 * Abuse limits.
 *
 * Auth routes (sign-in, sign-up, password, deletion) are limited per IP by
 * Better Auth. See `src/lib/auth.ts`. Those follow the usual credential-stuffing
 * cap: a handful of attempts, then a cool-down (OWASP Authentication Cheat Sheet).
 *
 * Writes below are limited per signed-in account with a fixed window. A fixed
 * window is the common HTTP API approach: the counter resets at `resetAt`, and
 * a rejected call returns 429 with Retry-After plus the RateLimit-* fields
 * (draft-ietf-httpapi-ratelimit-headers).
 */
export const RATE_RULES = {
  /** Avatar and other file uploads. */
  upload: { name: "upload", max: 30, windowSec: 60 * 60 },
  /** New stickers, including their artwork. */
  stickerCreate: { name: "sticker-create", max: 10, windowSec: 60 * 60 },
  /** Edits, moves, and restores. */
  stickerWrite: { name: "sticker-write", max: 60, windowSec: 60 * 60 },
  /** Content reports. One open report per sticker is enforced separately. */
  report: { name: "report", max: 10, windowSec: 60 * 60 },
  /** Email changes go through our route, not the auth handler. */
  emailChange: { name: "email-change", max: 5, windowSec: 15 * 60 },
  /** Saving, updating, and deleting print sheets. */
  printSheet: { name: "print-sheet", max: 30, windowSec: 60 * 60 },
  /** Visitor and click counters, per IP: rotating user agents can't inflate them. */
  statsVisit: { name: "stats-visit", max: 60, windowSec: 60 * 60 },
  statsClick: { name: "stats-click", max: 60, windowSec: 60 * 60 },
} as const

export type RateRule = (typeof RATE_RULES)[keyof typeof RATE_RULES]

type Bucket = { count: number; resetAt: Date }

/** Next fixed-window bucket. A window that has elapsed starts again at 1. */
export function nextBucket(
  current: Bucket | null,
  now: Date,
  windowSec: number
): Bucket {
  if (!current || current.resetAt.getTime() <= now.getTime()) {
    return { count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) }
  }
  return { count: current.count + 1, resetAt: current.resetAt }
}

export function rateLimitDecision(
  count: number,
  max: number,
  resetAt: Date,
  now: Date
) {
  const retryAfter = Math.max(
    1,
    Math.ceil((resetAt.getTime() - now.getTime()) / 1000)
  )
  return {
    allowed: count <= max,
    retryAfter,
    remaining: Math.max(0, max - count),
  }
}

function tooMany(rule: RateRule, retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "RateLimit-Limit": String(rule.max),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  )
}

/**
 * Counts one request for this account and rule.
 * Returns a 429 response when the window is already full, otherwise null.
 */
export async function enforceRateLimit(
  userId: string,
  rule: RateRule
): Promise<Response | null> {
  if (process.env.NODE_ENV === "test") return null

  const key = `${rule.name}:${userId}`
  const resetAt = new Date(Date.now() + rule.windowSec * 1000)
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO api_rate_limit (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN api_rate_limit."resetAt" <= NOW() THEN 1
        ELSE api_rate_limit.count + 1
      END,
      "resetAt" = CASE
        WHEN api_rate_limit."resetAt" <= NOW() THEN EXCLUDED."resetAt"
        ELSE api_rate_limit."resetAt"
      END
    RETURNING count, "resetAt"
  `
  const row = rows[0]
  if (!row) return null

  const now = new Date()
  const decision = rateLimitDecision(
    row.count,
    rule.max,
    new Date(row.resetAt),
    now
  )
  if (decision.allowed) {
    if (row.count === 1) {
      await prisma.$executeRaw`
        DELETE FROM api_rate_limit WHERE "resetAt" < NOW() - INTERVAL '1 day'
      `.catch(() => undefined)
    }
    return null
  }
  return tooMany(rule, decision.retryAfter)
}
