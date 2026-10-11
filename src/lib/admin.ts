import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import type { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminRole, isBanActive } from "@/lib/roles"
import {
  listedStickerWhere,
  serializeSticker,
  stickerImageUrl,
  type StickerDTO,
} from "@/lib/sticker-api"
import { clearFromWall } from "@/lib/wall"

export const ADMIN_PAGE_SIZE = 30

async function requireAdmin() {
  const headers = getRequest().headers
  const session = await auth.api.getSession({ headers })
  if (!session || !isAdminRole(session.user.role)) {
    throw new Error("Forbidden")
  }
  return { user: session.user, headers }
}

function pageOf(page: unknown): number {
  const n = Number(page)
  return Number.isInteger(n) && n > 0 ? n : 1
}

function searchOf(q: unknown): string | undefined {
  return typeof q === "string" ? q.trim().slice(0, 80) || undefined : undefined
}

function idOf(input: unknown): string {
  const id = (input as { id?: unknown } | null)?.id
  if (typeof id !== "string" || !id) throw new Error("Missing id.")
  return id
}

function reasonOf(input: unknown): string | null {
  const reason = (input as { reason?: unknown } | null)?.reason
  return typeof reason === "string" ? reason.trim().slice(0, 300) || null : null
}

function activeBanWhere(): Prisma.UserWhereInput {
  return {
    banned: true,
    OR: [{ banExpires: null }, { banExpires: { gt: new Date() } }],
  }
}

// ─── Overview ──────────────────────────────────────────────────────────────

export type AdminOverview = {
  users: number
  admins: number
  banned: number
  newUsers7d: number
  stickers: number
  listed: number
  hidden: number
  archived: number
  newStickers7d: number
  revenue: number
  recentUsers: AdminUserRow[]
  recentStickers: AdminStickerRow[]
}

export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    await requireAdmin()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [
      users,
      admins,
      banned,
      newUsers7d,
      stickers,
      listed,
      hidden,
      archived,
      newStickers7d,
      revenue,
      recentUsers,
      recentStickers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { contains: "admin" } } }),
      prisma.user.count({ where: activeBanWhere() }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.sticker.count(),
      prisma.sticker.count({ where: listedStickerWhere() }),
      prisma.sticker.count({ where: { hiddenAt: { not: null } } }),
      prisma.sticker.count({ where: { archivedAt: { not: null } } }),
      prisma.sticker.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.sticker.aggregate({ _sum: { totalSpent: true } }),
      findUserRows({}, 0, 5),
      findStickerRows({}, 0, 5),
    ])
    return {
      users,
      admins,
      banned,
      newUsers7d,
      stickers,
      listed,
      hidden,
      archived,
      newStickers7d,
      revenue: revenue._sum.totalSpent ?? 0,
      recentUsers,
      recentStickers,
    }
  }
)

// ─── Users ─────────────────────────────────────────────────────────────────

export type AdminUserFilter = "all" | "banned" | "admins"

export type AdminUserRow = {
  id: string
  name: string
  email: string
  image: string | null
  isAdmin: boolean
  banned: boolean
  banReason: string | null
  /** ISO date; null while banned means forever. */
  banExpires: string | null
  createdAt: string
  stickerCount: number
  totalSpent: number
}

type Page<T> = { items: T[]; page: number; pageCount: number; total: number }

async function findUserRows(
  where: Prisma.UserWhereInput,
  skip: number,
  take: number
): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip,
    take,
    include: { _count: { select: { stickers: true } } },
  })
  const spent = await prisma.sticker.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _sum: { totalSpent: true },
  })
  const spentBy = new Map(spent.map((s) => [s.userId, s._sum.totalSpent ?? 0]))
  return users.map((u) => toUserRow(u, u._count.stickers, spentBy.get(u.id)))
}

function toUserRow(
  u: {
    id: string
    name: string
    email: string
    image: string | null
    role: string | null
    banned: boolean | null
    banReason: string | null
    banExpires: Date | null
    createdAt: Date
  },
  stickerCount: number,
  totalSpent = 0
): AdminUserRow {
  const banned = isBanActive(u)
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    isAdmin: isAdminRole(u.role),
    banned,
    banReason: banned ? u.banReason : null,
    banExpires: banned ? (u.banExpires?.toISOString() ?? null) : null,
    createdAt: u.createdAt.toISOString(),
    stickerCount,
    totalSpent,
  }
}

export type AdminUserQuery = {
  q?: string
  filter?: AdminUserFilter
  page?: number
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .validator(
    (
      input: AdminUserQuery
    ): Required<Omit<AdminUserQuery, "q">> & {
      q?: string
    } => ({
      q: searchOf(input.q),
      filter:
        input.filter === "banned" || input.filter === "admins"
          ? input.filter
          : "all",
      page: pageOf(input.page),
    })
  )
  .handler(async ({ data }): Promise<Page<AdminUserRow>> => {
    await requireAdmin()
    const where: Prisma.UserWhereInput = {
      ...(data.filter === "banned" ? activeBanWhere() : {}),
      ...(data.filter === "admins" ? { role: { contains: "admin" } } : {}),
      ...(data.q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: data.q, mode: "insensitive" } },
                  { email: { contains: data.q, mode: "insensitive" } },
                  { id: data.q },
                ],
              },
            ],
          }
        : {}),
    }
    const total = await prisma.user.count({ where })
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
    const page = Math.min(data.page, pageCount)
    const items = await findUserRows(
      where,
      (page - 1) * ADMIN_PAGE_SIZE,
      ADMIN_PAGE_SIZE
    )
    return { items, page, pageCount, total }
  })

export type AdminSession = {
  id: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
}

export type AdminUserDetail = AdminUserRow & {
  emailVerified: boolean
  /** Sign-in methods, e.g. "credential". */
  providers: string[]
  sessions: AdminSession[]
  stickers: (StickerDTO & { onWall: number })[]
}

export const getAdminUser = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminUserDetail | null> => {
    await requireAdmin()
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: { select: { providerId: true } },
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        },
        stickers: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { placements: true } } },
        },
      },
    })
    if (!user) return null
    const totalSpent = user.stickers.reduce((sum, s) => sum + s.totalSpent, 0)
    return {
      ...toUserRow(user, user.stickers.length, totalSpent),
      emailVerified: user.emailVerified,
      providers: [...new Set(user.accounts.map((a) => a.providerId))],
      sessions: user.sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      })),
      stickers: user.stickers.map(({ _count, ...s }) => ({
        ...serializeSticker(s),
        onWall: _count.placements,
      })),
    }
  })

/** Ban days; 0 bans until lifted by hand. */
export const BAN_DURATIONS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 0, label: "Permanent" },
] as const

async function assertNotAdmin(userId: string, action: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!target) throw new Error("User not found.")
  if (isAdminRole(target.role)) {
    throw new Error(`Remove their admin role before you ${action} them.`)
  }
}

export const banUser = createServerFn({ method: "POST" })
  .validator((input: { id: string; reason?: string; days?: number }) => ({
    id: idOf(input),
    reason: reasonOf(input),
    days:
      Number.isInteger(input.days) && input.days! > 0
        ? Math.min(input.days!, 3650)
        : 0,
  }))
  .handler(async ({ data }) => {
    const { headers } = await requireAdmin()
    await assertNotAdmin(data.id, "ban")
    await auth.api.banUser({
      headers,
      body: {
        userId: data.id,
        banReason: data.reason ?? undefined,
        banExpiresIn: data.days ? data.days * 24 * 60 * 60 : undefined,
      },
    })
    return { ok: true }
  })

export const unbanUser = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: idOf(input) }))
  .handler(async ({ data }) => {
    const { headers } = await requireAdmin()
    await auth.api.unbanUser({ headers, body: { userId: data.id } })
    return { ok: true }
  })

export const setUserAdmin = createServerFn({ method: "POST" })
  .validator((input: { id: string; admin: boolean }) => ({
    id: idOf(input),
    admin: input.admin === true,
  }))
  .handler(async ({ data }) => {
    const { user, headers } = await requireAdmin()
    if (data.id === user.id && !data.admin) {
      throw new Error("You can't remove your own admin role.")
    }
    if (data.admin) {
      const target = await prisma.user.findUnique({ where: { id: data.id } })
      if (target && isBanActive(target)) {
        throw new Error("Unban this user before making them an admin.")
      }
    }
    await auth.api.setRole({
      headers,
      body: { userId: data.id, role: data.admin ? "admin" : "user" },
    })
    return { ok: true }
  })

export const revokeUserSessions = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: idOf(input) }))
  .handler(async ({ data }) => {
    const { headers } = await requireAdmin()
    await auth.api.revokeUserSessions({ headers, body: { userId: data.id } })
    return { ok: true }
  })

/** Deletes the account, its stickers and uploads, and frees its wall plots. */
export const deleteUser = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: idOf(input) }))
  .handler(async ({ data }) => {
    const { user } = await requireAdmin()
    if (data.id === user.id) throw new Error("You can't delete yourself.")
    await assertNotAdmin(data.id, "delete")
    await prisma.$transaction(
      async (tx) => {
        const stickers = await tx.sticker.findMany({
          where: { userId: data.id },
          select: { id: true },
        })
        const ids = stickers.map((s) => s.id)
        await clearFromWall(tx, ids)
        // Stickers restrict upload deletes, so they go before the user cascade.
        await tx.sticker.deleteMany({ where: { id: { in: ids } } })
        await tx.user.delete({ where: { id: data.id } })
      },
      { timeout: 30_000 }
    )
    return { ok: true }
  })

// ─── Stickers ──────────────────────────────────────────────────────────────

export type AdminStickerFilter = "all" | "listed" | "hidden" | "archived"

export type AdminStickerRow = {
  id: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: string
  imageUrl: string
  totalSpent: number
  onWall: number
  archivedAt: string | null
  hiddenAt: string | null
  hiddenReason: string | null
  createdAt: string
  owner: { id: string; name: string; email: string; banned: boolean }
}

async function findStickerRows(
  where: Prisma.StickerWhereInput,
  skip: number,
  take: number
): Promise<AdminStickerRow[]> {
  const rows = await prisma.sticker.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip,
    take,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          banned: true,
          banExpires: true,
        },
      },
      _count: { select: { placements: true } },
    },
  })
  return rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    oneLiner: s.oneLiner,
    url: s.url,
    category: s.category,
    imageUrl: stickerImageUrl(s.id),
    totalSpent: s.totalSpent,
    onWall: s._count.placements,
    archivedAt: s.archivedAt?.toISOString() ?? null,
    hiddenAt: s.hiddenAt?.toISOString() ?? null,
    hiddenReason: s.hiddenReason,
    createdAt: s.createdAt.toISOString(),
    owner: {
      id: s.user.id,
      name: s.user.name,
      email: s.user.email,
      banned: isBanActive(s.user),
    },
  }))
}

export type AdminStickerQuery = {
  q?: string
  filter?: AdminStickerFilter
  page?: number
}

export const listAdminStickers = createServerFn({ method: "GET" })
  .validator(
    (
      input: AdminStickerQuery
    ): Required<Omit<AdminStickerQuery, "q">> & {
      q?: string
    } => ({
      q: searchOf(input.q),
      filter:
        input.filter === "listed" ||
        input.filter === "hidden" ||
        input.filter === "archived"
          ? input.filter
          : "all",
      page: pageOf(input.page),
    })
  )
  .handler(async ({ data }): Promise<Page<AdminStickerRow>> => {
    await requireAdmin()
    const byFilter: Record<AdminStickerFilter, Prisma.StickerWhereInput> = {
      all: {},
      listed: listedStickerWhere(),
      hidden: { hiddenAt: { not: null } },
      archived: { archivedAt: { not: null } },
    }
    const where: Prisma.StickerWhereInput = {
      ...byFilter[data.filter],
      ...(data.q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: data.q, mode: "insensitive" } },
                  { slug: { contains: data.q, mode: "insensitive" } },
                  { url: { contains: data.q, mode: "insensitive" } },
                  {
                    user: {
                      email: { contains: data.q, mode: "insensitive" },
                    },
                  },
                  { id: data.q },
                ],
              },
            ],
          }
        : {}),
    }
    const total = await prisma.sticker.count({ where })
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
    const page = Math.min(data.page, pageCount)
    const items = await findStickerRows(
      where,
      (page - 1) * ADMIN_PAGE_SIZE,
      ADMIN_PAGE_SIZE
    )
    return { items, page, pageCount, total }
  })

export const hideSticker = createServerFn({ method: "POST" })
  .validator((input: { id: string; reason?: string }) => ({
    id: idOf(input),
    reason: reasonOf(input),
  }))
  .handler(async ({ data }) => {
    await requireAdmin()
    await prisma.sticker.update({
      where: { id: data.id },
      data: { hiddenAt: new Date(), hiddenReason: data.reason },
    })
    return { ok: true }
  })

export const unhideSticker = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: idOf(input) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    await prisma.sticker.update({
      where: { id: data.id },
      data: { hiddenAt: null, hiddenReason: null },
    })
    return { ok: true }
  })

/** Deletes the sticker and frees its wall plots; the upload file stays in storage. */
export const deleteSticker = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: idOf(input) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    await prisma.$transaction(
      async (tx) => {
        await clearFromWall(tx, [data.id])
        await tx.sticker.delete({ where: { id: data.id } })
      },
      { timeout: 30_000 }
    )
    return { ok: true }
  })
