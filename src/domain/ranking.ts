export type RankableSticker = {
  id: string
  category: string
  createdAt: string
  /** Whole dollars paid for wall placements. */
  totalSpent: number
}

export type StickerRank = {
  overall: number
  overallOf: number
  category: number
  categoryOf: number
  /** Dollars paid across every placement of the sticker. */
  spent: number
}

/**
 * Leaderboard by money spent on placements ($1 per square unit). Ties go to
 * whoever listed first. Stickers that never paid for a placement are unranked.
 */
export function rankStickers(
  stickers: ReadonlyArray<RankableSticker>
): Map<string, StickerRank> {
  const ranked = stickers
    .filter((s) => s.totalSpent > 0)
    .sort(
      (a, b) =>
        b.totalSpent - a.totalSpent ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id)
    )

  const categoryCounts = new Map<string, number>()
  for (const s of ranked) {
    categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1)
  }

  const seen = new Map<string, number>()
  const out = new Map<string, StickerRank>()
  ranked.forEach((s, i) => {
    const inCategory = (seen.get(s.category) ?? 0) + 1
    seen.set(s.category, inCategory)
    out.set(s.id, {
      overall: i + 1,
      overallOf: ranked.length,
      category: inCategory,
      categoryOf: categoryCounts.get(s.category) ?? 0,
      spent: s.totalSpent,
    })
  })
  return out
}
