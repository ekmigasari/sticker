import { createServerFn } from "@tanstack/react-start"
import { prisma } from "@/lib/prisma"
import { statsToday } from "@/lib/visits"

export type SiteStats = {
  today: number
  /** Sum of each day's unique visitors. */
  total: number
}

/** Null when the database is unreachable, so the wall still renders. */
export const getSiteStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteStats | null> => {
    try {
      const rows = await prisma.$queryRaw<SiteStats[]>`
        SELECT
          COALESCE(SUM(visitors) FILTER (WHERE day = ${statsToday()}::date), 0)::int AS today,
          COALESCE(SUM(visitors), 0)::int AS total
        FROM site_daily_stat
      `
      return rows[0] ?? { today: 0, total: 0 }
    } catch {
      return null
    }
  }
)
