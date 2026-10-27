import { getIP } from "better-auth/api"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RATE_RULES, type RateRule } from "@/lib/rate-limit"
import { visibleStickerWhere } from "@/lib/sticker-api"
import { hashVisitor, isBot, statsDay } from "@/lib/visitor"

/** IANA zone where "today" starts and ends, e.g. "Asia/Jakarta". */
const timeZone = process.env.STATS_TIME_ZONE || "UTC"

export function statsToday(): string {
  return statsDay(new Date(), timeZone)
}

type Visitor = { id: string; day: string }

/**
 * Hashed visitor for this request, or a reason not to count it: bots and
 * requests without a trustworthy client IP are skipped, and a 429 comes back
 * once an IP sends too many.
 */
async function visitorFor(
  request: Request,
  rule: RateRule
): Promise<Visitor | Response | null> {
  const userAgent = request.headers.get("user-agent") ?? ""
  if (!userAgent || isBot(userAgent)) return null
  const ip = getIP(request, auth.options)
  if (!ip) return null
  const limited = await enforceRateLimit(`ip:${ip}`, rule)
  if (limited) return limited
  const day = statsToday()
  const id = await hashVisitor({
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    day,
    ip,
    userAgent,
  })
  return { id, day }
}

/** De-duplication rows are only needed for today. */
async function pruneOldVisitors(day: string) {
  await prisma.$executeRaw`DELETE FROM site_visitor WHERE day < ${day}::date`
  await prisma.$executeRaw`DELETE FROM sticker_click WHERE day < ${day}::date`
}

export async function recordVisit(request: Request): Promise<Response | null> {
  const visitor = await visitorFor(request, RATE_RULES.statsVisit)
  if (!visitor || visitor instanceof Response) return visitor
  const rows = await prisma.$queryRaw<Array<{ visitors: number }>>`
    WITH fresh AS (
      INSERT INTO site_visitor (day, visitor)
      VALUES (${visitor.day}::date, ${visitor.id})
      ON CONFLICT DO NOTHING
      RETURNING day
    )
    INSERT INTO site_daily_stat (day, visitors)
    SELECT day, 1 FROM fresh
    ON CONFLICT (day) DO UPDATE SET visitors = site_daily_stat.visitors + 1
    RETURNING visitors
  `
  // First visitor of the day clears out yesterday's hashes.
  if (rows[0]?.visitors === 1) {
    await pruneOldVisitors(visitor.day).catch(() => undefined)
  }
  return null
}

export async function recordStickerClick(
  request: Request,
  stickerId: string
): Promise<Response | null> {
  const sticker = await prisma.sticker.findFirst({
    where: { id: stickerId, ...visibleStickerWhere() },
    select: { id: true, userId: true },
  })
  if (!sticker) return null
  const session = await auth.api.getSession({ headers: request.headers })
  if (session?.user.id === sticker.userId) return null

  const visitor = await visitorFor(request, RATE_RULES.statsClick)
  if (!visitor || visitor instanceof Response) return visitor
  await prisma.$executeRaw`
    WITH fresh AS (
      INSERT INTO sticker_click ("stickerId", day, visitor)
      VALUES (${sticker.id}, ${visitor.day}::date, ${visitor.id})
      ON CONFLICT DO NOTHING
      RETURNING "stickerId"
    )
    UPDATE sticker SET clicks = clicks + 1
    WHERE id IN (SELECT "stickerId" FROM fresh)
  `
  return null
}
