import {
  DETAIL_LIMITS,
  isCategory,
  isIsoDate,
  normalizeCategory,
  type Category,
} from "@/domain/types"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizeStickerUrl, slugifyName } from "@/lib/sticker-meta"

export { isCategory }

/** Leaderboard order; must match the tie-breaks in `rankStickers`. */
export const TOP_STICKER_ORDER = [
  { totalSpent: "desc" },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.StickerOrderByWithRelationInput[]

export type StickerDTO = {
  id: string
  userId: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: Category
  description?: string
  offer?: string
  offerCode?: string
  offerExpiresOn?: string
  style: string
  filter: string
  finish: string
  outlineColor: string
  outlineThickness: number
  /** Whole dollars paid for wall placements. */
  totalSpent: number
  imageUrl: string
  /** Set while hidden from the directory and rankings. */
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

type StickerRecord = {
  id: string
  userId: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: string
  description: string | null
  offer: string | null
  offerCode: string | null
  offerExpiresOn: Date | null
  style: string
  filter: string
  finish: string
  outlineColor: string
  outlineThickness: number
  totalSpent: number
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function stickerImageUrl(id: string): string {
  return `/api/stickers/${id}/image`
}

export function serializeSticker(sticker: StickerRecord): StickerDTO {
  return {
    id: sticker.id,
    userId: sticker.userId,
    slug: sticker.slug,
    name: sticker.name,
    oneLiner: sticker.oneLiner,
    url: sticker.url,
    category: normalizeCategory(sticker.category),
    description: sticker.description ?? undefined,
    offer: sticker.offer ?? undefined,
    offerCode: sticker.offerCode ?? undefined,
    offerExpiresOn: sticker.offerExpiresOn?.toISOString().slice(0, 10),
    style: sticker.style,
    filter: sticker.filter,
    finish: sticker.finish,
    outlineColor: sticker.outlineColor,
    outlineThickness: sticker.outlineThickness,
    totalSpent: sticker.totalSpent,
    imageUrl: stickerImageUrl(sticker.id),
    archivedAt: sticker.archivedAt?.toISOString(),
    createdAt: sticker.createdAt.toISOString(),
    updatedAt: sticker.updatedAt.toISOString(),
  }
}

export async function allocateUniqueSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugifyName(name)
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const existing = await prisma.sticker.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

function optionalText(value: unknown, max: number): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}

export function parseStickerDetails(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid JSON body." as const }
  }
  const data = body as Record<string, unknown>
  const name = String(data.name ?? "").trim()
  const oneLiner = String(data.oneLiner ?? "").trim()
  const url = String(data.url ?? "").trim()
  const category = String(data.category ?? "").trim()

  if (!name) return { error: "Title is required." as const }
  if (!oneLiner) return { error: "Short description is required." as const }
  if (!url) return { error: "Link is required." as const }
  if (!isCategory(category)) {
    return { error: "Pick a valid category." as const }
  }

  const normalizedUrl = normalizeStickerUrl(url)
  if (!normalizedUrl) {
    return {
      error: "Enter a full website link (e.g. https://yoursite.com)." as const,
    }
  }

  const offer = optionalText(data.offer, DETAIL_LIMITS.offer)
  const offerCode = optionalText(data.offerCode, DETAIL_LIMITS.offerCode)
  const offerExpiresOn = optionalText(data.offerExpiresOn, 10)
  if (offerCode && /\s/.test(offerCode)) {
    return { error: "Discount codes can't contain spaces." as const }
  }
  if (offerExpiresOn && !isIsoDate(offerExpiresOn)) {
    return { error: "Enter a valid promo expiry date." as const }
  }
  if (!offer && (offerCode || offerExpiresOn)) {
    return { error: "Describe the deal for your promo." as const }
  }

  return {
    data: {
      name: name.slice(0, DETAIL_LIMITS.name),
      oneLiner: oneLiner.slice(0, DETAIL_LIMITS.oneLiner),
      url: normalizedUrl.slice(0, 500),
      category,
      description: optionalText(data.description, DETAIL_LIMITS.description),
      offer,
      offerCode: offer ? offerCode : null,
      offerExpiresOn:
        offer && offerExpiresOn
          ? new Date(`${offerExpiresOn}T00:00:00Z`)
          : null,
    },
  }
}

export async function getOwnedSticker(stickerId: string, userId: string) {
  return prisma.sticker.findFirst({
    where: { id: stickerId, userId },
  })
}

export async function findStickerBySlugOrId(slugOrId: string) {
  const bySlug = await prisma.sticker.findUnique({ where: { slug: slugOrId } })
  if (bySlug) return bySlug
  return prisma.sticker.findUnique({ where: { id: slugOrId } })
}
