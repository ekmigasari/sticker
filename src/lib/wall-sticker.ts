import type { Sticker } from "@/domain/types"
import type { StickerDTO } from "@/lib/sticker-api"

/** Wall-facing sticker shape; artwork is served from the image route. */
export function wallStickerFromDTO(s: StickerDTO): Sticker {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    oneLiner: s.oneLiner,
    url: s.url,
    category: s.category,
    description: s.description,
    offer: s.offer,
    offerCode: s.offerCode,
    offerExpiresOn: s.offerExpiresOn,
    imageDataUrl: s.imageUrl,
    outlineColor: s.outlineColor,
    outlineThickness: s.outlineThickness,
    createdAt: s.createdAt,
  }
}
