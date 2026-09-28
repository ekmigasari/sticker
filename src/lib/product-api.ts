import { CATEGORIES, type Category } from "@/domain/types"
import { prisma } from "@/lib/prisma"

export type ProductDTO = {
  id: string
  userId: string
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
  createdAt: string
  updatedAt: string
  stickerCount: number
}

export type StickerDTO = {
  id: string
  productId: string
  userId: string
  style: string
  filter: string
  outlineColor: string
  outlineThickness: number
  imageUrl: string
  createdAt: string
}

const categorySet = new Set<string>(CATEGORIES)

export function isCategory(value: string): value is Category {
  return categorySet.has(value)
}

type ProductRecord = {
  id: string
  userId: string
  name: string
  oneLiner: string
  url: string
  category: string
  offer: string | null
  createdAt: Date
  updatedAt: Date
}

export function serializeProduct(
  product: ProductRecord & { stickerCount?: number; stickers?: unknown[] }
): ProductDTO {
  const stickerCount =
    product.stickerCount ?? product.stickers?.length ?? 0
  return {
    id: product.id,
    userId: product.userId,
    name: product.name,
    oneLiner: product.oneLiner,
    url: product.url,
    category: isCategory(product.category) ? product.category : "Other",
    offer: product.offer ?? undefined,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    stickerCount,
  }
}

/** Prisma returns sticker totals under `_count`; normalize before serialize. */
export function withStickerCount<T extends ProductRecord>(
  product: T & { _count: { stickers: number } }
) {
  return { ...product, stickerCount: product._count.stickers }
}

export function serializeSticker(sticker: {
  id: string
  productId: string
  userId: string
  style: string
  filter: string
  outlineColor: string
  outlineThickness: number
  createdAt: Date
}): StickerDTO {
  return {
    id: sticker.id,
    productId: sticker.productId,
    userId: sticker.userId,
    style: sticker.style,
    filter: sticker.filter,
    outlineColor: sticker.outlineColor,
    outlineThickness: sticker.outlineThickness,
    imageUrl: `/api/stickers/${sticker.id}/image`,
    createdAt: sticker.createdAt.toISOString(),
  }
}

export function parseProductBody(body: unknown) {
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

  if (!name) return { error: "Name is required." as const }
  if (!oneLiner) return { error: "One-liner is required." as const }
  if (!url) return { error: "Website URL is required." as const }
  if (!isCategory(category)) {
    return { error: "Pick a valid category." as const }
  }

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`
  if (!URL.canParse(normalizedUrl)) {
    return { error: "Website URL looks invalid." as const }
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

export async function getOwnedProduct(productId: string, userId: string) {
  return prisma.product.findFirst({
    where: { id: productId, userId },
  })
}
