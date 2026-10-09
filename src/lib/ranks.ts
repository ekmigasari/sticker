import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export type StickerRankPair = { overall: number; category: number }

/** Ranks are derived from `totalSpent` at read time, never stored. */
export async function ranksFor(
  ids: string[]
): Promise<Map<string, StickerRankPair>> {
  if (!ids.length) return new Map()
  const rows = await prisma.$queryRaw<
    { id: string; overall: bigint; category_rank: bigint }[]
  >`
    SELECT id, overall, category_rank FROM (
      SELECT id,
        ROW_NUMBER() OVER (ORDER BY "totalSpent" DESC, "createdAt" ASC, id ASC) AS overall,
        ROW_NUMBER() OVER (
          PARTITION BY category ORDER BY "totalSpent" DESC, "createdAt" ASC, id ASC
        ) AS category_rank
      FROM sticker
      WHERE "totalSpent" > 0 AND "archivedAt" IS NULL
    ) ranked
    WHERE id IN (${Prisma.join(ids)})
  `
  return new Map(
    rows.map((r) => [
      r.id,
      { overall: Number(r.overall), category: Number(r.category_rank) },
    ])
  )
}
