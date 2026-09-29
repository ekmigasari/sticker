import { CATEGORIES, type Category } from "@/domain/types"
import { prisma } from "@/lib/prisma"

export type StickerDTO = {
  id: string
  userId: string
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

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`
  if (!URL.canParse(normalizedUrl)) {
    return { error: "Link looks invalid." as const }
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
