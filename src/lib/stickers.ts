import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import {
  CATEGORIES,
  isCategory,
  normalizeCategory,
  restoreQuote,
  visibleAreaShare,
  type Category,
  type MoveSpot,
  type RestoreQuote,
} from "@/domain/types"
import type { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ranksFor, type StickerRankPair } from "@/lib/ranks"
import {
  findStickerBySlugOrId,
  serializeSticker,
  stickerImageUrl,
  TOP_STICKER_ORDER,
  type StickerDTO,
} from "@/lib/sticker-api"
import { serializePlacement } from "@/lib/wall"

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export type MySticker = StickerDTO & {
  /** Plots on the wall, fully covered ones included: they keep their spot. */
  onWall: number
  /** Share of all units bought that still shows; null when never placed. */
  visibleShare: number | null
  /** Cost to put every covered plot back on top; null when none is covered. */
  restore: RestoreQuote | null
  /** Most covered first, so a move picks the plot that needs it most. */
  spots: MoveSpot[]
}

export const listMyStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<MySticker[]> => {
    const user = await requireUser()
    const stickers = await prisma.sticker.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        placements: {
          select: {
            id: true,
            visibleShare: true,
            unitsW: true,
            unitsH: true,
            stickerScale: true,
            rotation: true,
            offsetX: true,
            offsetY: true,
          },
          orderBy: { visibleShare: "asc" },
        },
      },
    })
    return stickers.map(({ placements, ...s }) => ({
      ...serializeSticker(s),
      onWall: placements.length,
      visibleShare: visibleAreaShare(placements),
      restore: restoreQuote(placements),
      spots: placements.map((p) => ({
        id: p.id,
        unitsW: p.unitsW,
        unitsH: p.unitsH,
        stickerScale: p.stickerScale,
        rotation: p.rotation,
        stickerOffsetX: p.offsetX,
        stickerOffsetY: p.offsetY,
      })),
    }))
  }
)

async function withPlacements(sticker: Parameters<typeof serializeSticker>[0]) {
  const placements = await prisma.placement.findMany({
    where: { stickerId: sticker.id },
    orderBy: { zIndex: "desc" },
  })
  return {
    ...serializeSticker(sticker),
    placements: placements.map(serializePlacement),
  }
}

export type StickerWithPlacements = Awaited<ReturnType<typeof withPlacements>>

export const getMySticker = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<StickerWithPlacements | null> => {
    const user = await requireUser()
    const sticker = await prisma.sticker.findFirst({
      where: { id, userId: user.id },
    })
    return sticker ? withPlacements(sticker) : null
  })

export const listPublicStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StickerDTO[]> => {
    const stickers = await prisma.sticker.findMany({
      where: { archivedAt: null },
      orderBy: TOP_STICKER_ORDER,
    })
    return stickers.map(serializeSticker)
  }
)

export const STICKERS_PAGE_SIZE = 50

export type StickerSort = "top" | "newest"

export type StickerListQuery = {
  category?: Category
  /** Only stickers with at least part of a plot still showing on the wall. */
  onWall?: boolean
  sort: StickerSort
  q?: string
  page: number
}

export type StickerListItem = StickerDTO & {
  /** Leaderboard position; absent until the sticker has paid for a plot. */
  rank?: StickerRankPair
}

export type StickerListPage = {
  items: StickerListItem[]
  page: number
  pageCount: number
  /** Matches for the current filters, across all pages. */
  total: number
  /** Every sticker on the wall, ignoring filters. */
  stickerCount: number
  /** Current top three, for the page header. */
  featured: StickerDTO[]
}

export const listStickerPage = createServerFn({ method: "GET" })
  .validator((input: StickerListQuery): StickerListQuery => ({
    category:
      input.category && isCategory(input.category) ? input.category : undefined,
    onWall: input.onWall === true || undefined,
    sort: input.sort === "newest" ? "newest" : "top",
    q: input.q?.trim().slice(0, 80) || undefined,
    page: Number.isInteger(input.page) && input.page > 0 ? input.page : 1,
  }))
  .handler(async ({ data }): Promise<StickerListPage> => {
    const where: Prisma.StickerWhereInput = {
      archivedAt: null,
      ...(data.category ? { category: data.category } : {}),
      ...(data.onWall
        ? { placements: { some: { visibleShare: { gt: 0 } } } }
        : {}),
      ...(data.q
        ? {
            OR: [
              { name: { contains: data.q, mode: "insensitive" } },
              { oneLiner: { contains: data.q, mode: "insensitive" } },
            ],
          }
        : {}),
    }
    const [total, stickerCount, featured] = await Promise.all([
      prisma.sticker.count({ where }),
      prisma.sticker.count({ where: { archivedAt: null } }),
      prisma.sticker.findMany({
        where: { archivedAt: null },
        orderBy: TOP_STICKER_ORDER,
        take: 3,
      }),
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
      stickerCount,
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
        WHERE "archivedAt" IS NULL
        GROUP BY category
      `,
      prisma.$queryRaw<{ id: string; category: string }[]>`
        SELECT id, category FROM (
          SELECT id, category,
            ROW_NUMBER() OVER (
              PARTITION BY category ORDER BY "totalSpent" DESC, "createdAt" ASC, id ASC
            ) AS position
          FROM sticker
          WHERE "archivedAt" IS NULL
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
    return sticker ? withPlacements(sticker) : null
  })
