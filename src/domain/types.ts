export const WALL_SIZE = 1000
/** Wall pixels per pricing unit (3×3 units → 30×30 on canvas). */
export const UNIT_SCALE = 10

export const CATEGORIES = [
  "Developer Tools",
  "SaaS",
  "AI",
  "Productivity",
  "Design",
  "Marketing",
  "Games",
  "Mobile",
  "Open Source",
  "Newsletter",
  "Community",
  "Services",
  "Personal Brand",
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

/** Directory / wall listing: one sticker = one identity + artwork. */
export type Sticker = {
  id: string
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
  imageDataUrl: string
  outlineColor: string
  outlineThickness: number
  createdAt: string
}

export type Placement = {
  id: string
  stickerId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  sizeTier: SizeTier
  createdAt: string
}

export const STICKER_STYLES = ["none", "classic", "stamp", "rough"] as const
export type StickerStyle = (typeof STICKER_STYLES)[number]

export const STICKER_FILTERS = [
  "original",
  "glitter",
  "glow",
  "vivid",
  "warm",
  "cool",
  "mono",
  "noir",
  "red",
  "blue",
  "green",
  "yellow",
] as const
export type StickerFilter = (typeof STICKER_FILTERS)[number]

/** Print DPI used when converting sticker pixels ↔ millimetres. */
export const STICKER_PRINT_DPI = 300

export function pxToMm(px: number, dpi = STICKER_PRINT_DPI): number {
  return (px * 25.4) / dpi
}

export function mmToPx(mm: number, dpi = STICKER_PRINT_DPI): number {
  return (mm * dpi) / 25.4
}

export type DraftSticker = {
  imageDataUrl: string
  style: StickerStyle
  filter: StickerFilter
  outlineColor: string
  outlineThickness: number
}

export type StickerDetails = {
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
}

export type PlaceDraft = {
  sticker: DraftSticker
  sizeTier: SizeTier
  details: StickerDetails
}
