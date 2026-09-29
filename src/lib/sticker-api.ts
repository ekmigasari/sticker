import { CATEGORIES, type Category } from "@/domain/types"
import { prisma } from "@/lib/prisma"
import {
  normalizeStickerUrl,
  slugifyName,
} from "@/lib/sticker-meta"

export type StickerDTO = {
  id: string
  userId: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
  style: string
  filter: string
  outlineColor: string
  outlineThickness: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

const categorySet = new Set<string>(CATEGORIES)

export function isCategory(value: string): value is Category {
  return categorySet.has(value)
}

type StickerRecord = {
  id: string
  userId: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: string
  offer: string | null
  style: string
  filter: string
  outlineColor: string
  outlineThickness: number
  createdAt: Date
  updatedAt: Date
}

export function serializeSticker(sticker: StickerRecord): StickerDTO {
  return {
    id: sticker.id,
    userId: sticker.userId,
    slug: sticker.slug,
    name: sticker.name,
    oneLiner: sticker.oneLiner,
    url: sticker.url,
    category: isCategory(sticker.category) ? sticker.category : "Other",
    offer: sticker.offer ?? undefined,
    style: sticker.style,
    filter: sticker.filter,
    outlineColor: sticker.outlineColor,
    outlineThickness: sticker.outlineThickness,
    imageUrl: `/api/stickers/${sticker.id}/image`,
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

export function parseStickerDetails(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid JSON body." as const }
  }
  const data = body as Record<string, unknown>
  const name = String(data.name ?? "").trim()
  const oneLiner = String(data.oneLiner ?? "").trim()
  const url = String(data.url ?? "").trim()
  const category = String(data.category ?? "").trim()
  const offerRaw = data.offer
  const offer =
    offerRaw == null || offerRaw === ""
      ? null
      : String(offerRaw).trim() || null

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

  return {
    data: {
      name: name.slice(0, 80),
      oneLiner: oneLiner.slice(0, 160),
      url: normalizedUrl.slice(0, 500),
      category,
      offer: offer ? offer.slice(0, 120) : null,
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
