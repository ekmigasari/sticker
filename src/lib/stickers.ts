import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import {
  CATEGORIES,
  isCategory,
  normalizeCategory,
  type Category,
} from "@/domain/types"
import { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  findStickerBySlugOrId,
  serializeSticker,
  stickerImageUrl,
  TOP_STICKER_ORDER,
  type StickerDTO,
} from "@/lib/sticker-api"

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export const listMyStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StickerDTO[]> => {
    const user = await requireUser()
    const stickers = await prisma.sticker.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })
    return stickers.map(serializeSticker)
  }
)

export const getMySticker = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<StickerDTO> => {
    const user = await requireUser()
    const sticker = await prisma.sticker.findFirst({
      where: { id, userId: user.id },
    })
    if (!sticker) {
      throw new Error("Sticker not found")
    }
    return serializeSticker(sticker)
  })

export const listPublicStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StickerDTO[]> => {
    const stickers = await prisma.sticker.findMany({
      orderBy: TOP_STICKER_ORDER,
    })
    return stickers.map(serializeSticker)
  }
)

export const STICKERS_PAGE_SIZE = 50

export type StickerSort = "top" | "newest"

export type StickerListQuery = {
  category?: Category
  sort: StickerSort
  q?: string
  page: number
}

export type StickerListItem = StickerDTO & {
  /** Leaderboard position; absent until the sticker has paid for a plot. */
  rank?: { overall: number; category: number }
}

export type StickerListPage = {
  items: StickerListItem[]
  page: number
  pageCount: number
  /** Matches for the current filters, across all pages. */
  total: number
  /** Dollars spent across every sticker, ignoring filters. */
  totalSpent: number
  /** Current top three, for the page header. */
  featured: StickerDTO[]
}

/** Ranks are derived from `totalSpent` at read time, never stored. */
async function ranksFor(ids: string[]) {
  if (!ids.length)
    return new Map<string, { overall: number; category: number }>()
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
      WHERE "totalSpent" > 0
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

export const listStickerPage = createServerFn({ method: "GET" })
  .validator((input: StickerListQuery): StickerListQuery => ({
    category:
      input.category && isCategory(input.category) ? input.category : undefined,
    sort: input.sort === "newest" ? "newest" : "top",
    q: input.q?.trim().slice(0, 80) || undefined,
    page: Number.isInteger(input.page) && input.page > 0 ? input.page : 1,
  }))
  .handler(async ({ data }): Promise<StickerListPage> => {
    const where: Prisma.StickerWhereInput = {
      ...(data.category ? { category: data.category } : {}),
      ...(data.q
        ? {
            OR: [
              { name: { contains: data.q, mode: "insensitive" } },
              { oneLiner: { contains: data.q, mode: "insensitive" } },
            ],
          }
        : {}),
    }
    const [total, totals, featured] = await Promise.all([
      prisma.sticker.count({ where }),
      prisma.$queryRaw<{ spent: number }[]>`
        SELECT COALESCE(SUM("totalSpent"), 0)::int AS spent FROM sticker
      `,
      prisma.sticker.findMany({ orderBy: TOP_STICKER_ORDER, take: 3 }),
    ])
    const pageCount = Math.max(1, Math.ceil(total / STICKERS_PAGE_SIZE))
    const page = Math.min(data.page, pageCount)
    const rows = await prisma.sticker.findMany({
      where,
      orderBy:
        data.sort === "newest"
          ? [{ createdAt: "desc" }, { id: "asc" }]
          : TOP_STICKER_ORDER,
      skip: (page - 1) * STICKERS_PAGE_SIZE,
      take: STICKERS_PAGE_SIZE,
    })
    const ranks = await ranksFor(rows.map((r) => r.id))

    return {
      items: rows.map((r) => ({
        ...serializeSticker(r),
        rank: ranks.get(r.id),
      })),
      page,
      pageCount,
      total,
      totalSpent: totals[0]?.spent ?? 0,
      featured: featured.map(serializeSticker),
    }
  })

export type CategorySummary = {
  category: Category
  count: number
  spent: number
  /** Image URLs of the category's top stickers. */
  previews: string[]
}

export const listCategorySummaries = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategorySummary[]> => {
    const [groups, top] = await Promise.all([
      prisma.$queryRaw<{ category: string; count: number; spent: number }[]>`
        SELECT category, COUNT(*)::int AS count,
          COALESCE(SUM("totalSpent"), 0)::int AS spent
        FROM sticker
        GROUP BY category
      `,
      prisma.$queryRaw<{ id: string; category: string }[]>`
        SELECT id, category FROM (
          SELECT id, category,
            ROW_NUMBER() OVER (
              PARTITION BY category ORDER BY "totalSpent" DESC, "createdAt" ASC, id ASC
            ) AS position
          FROM sticker
        ) ranked
        WHERE position <= 3
        ORDER BY category, position
      `,
    ])

    const byCategory = new Map<Category, CategorySummary>(
      CATEGORIES.map((category) => [
        category,
        { category, count: 0, spent: 0, previews: [] },
      ])
    )
    for (const g of groups) {
      const summary = byCategory.get(normalizeCategory(g.category))!
      summary.count += g.count
      summary.spent += g.spent
    }
    for (const t of top) {
      const summary = byCategory.get(normalizeCategory(t.category))!
      if (summary.previews.length < 3) {
        summary.previews.push(stickerImageUrl(t.id))
      }
    }
    return [...byCategory.values()]
  }
)

export const getPublicSticker = createServerFn({ method: "GET" })
  .validator((slugOrId: string) => slugOrId)
  .handler(async ({ data: slugOrId }) => {
    const sticker = await findStickerBySlugOrId(slugOrId)
    if (!sticker) return null
    return serializeSticker(sticker)
  })
