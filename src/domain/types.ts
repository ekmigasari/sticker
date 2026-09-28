export const WALL_SIZE = 1000
/** Wall pixels per pricing unit (3×3 units → 30×30 on canvas). */
export const UNIT_SCALE = 10

export const CATEGORIES = [
  "Tool",
  "SaaS",
  "Newsletter",
  "Game",
  "App",
  "Design",
  "Other",
] as const

export type Category = (typeof CATEGORIES)[number]

export const SIZE_TIERS = {
  S: { key: "S", label: "Small", units: 3, price: 9 },
  M: { key: "M", label: "Medium", units: 5, price: 25 },
  L: { key: "L", label: "Large", units: 10, price: 100 },
} as const

export type SizeTier = keyof typeof SIZE_TIERS

export function sizePx(tier: SizeTier): number {
  return SIZE_TIERS[tier].units * UNIT_SCALE
}

export type Product = {
  id: string
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
  createdAt: string
}

export type Sticker = {
  id: string
  imageDataUrl: string
  outlineColor: string
  outlineThickness: number
  createdAt: string
}

export type Placement = {
  id: string
  stickerId: string
  productId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  sizeTier: SizeTier
  createdAt: string
}

export const STICKER_STYLES = ["classic", "stamp", "rough"] as const
export type StickerStyle = (typeof STICKER_STYLES)[number]

export const STICKER_FILTERS = [
  "original",
  "glitter",
  "vivid",
  "warm",
  "cool",
  "mono",
  "noir",
] as const
export type StickerFilter = (typeof STICKER_FILTERS)[number]

export type DraftSticker = {
  imageDataUrl: string
  style: StickerStyle
  filter: StickerFilter
  outlineColor: string
  outlineThickness: number
}

export type PlaceDraft = {
  sticker: DraftSticker
  sizeTier: SizeTier
  product: Omit<Product, "id" | "createdAt">
}
