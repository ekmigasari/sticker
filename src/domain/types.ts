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

/** Min/max side length for a wall plot (pricing units). */
export const PLOT_MIN = 3
export const PLOT_MAX = 100
/** Longest side ÷ shortest side cannot exceed this (16:9). */
export const PLOT_MAX_RATIO = 16 / 9

export type PlotSize = { w: number; h: number }

/**
 * Quick-pick wall plot templates.
 * Price = w × h ($1 per unit²). Examples: 3×3 → $9, 16×10 → $160.
 */
export const PLOT_PRESETS: ReadonlyArray<{
  id: string
  label: string
  hint: string
  w: number
  h: number
}> = [
  { id: "3x3", label: "3×3", hint: "Mini", w: 3, h: 3 },
  { id: "5x5", label: "5×5", hint: "Small", w: 5, h: 5 },
  { id: "8x8", label: "8×8", hint: "Medium", w: 8, h: 8 },
  { id: "10x10", label: "10×10", hint: "Large", w: 10, h: 10 },
  { id: "4x3", label: "4×3", hint: "Classic", w: 4, h: 3 },
  { id: "12x9", label: "12×9", hint: "4:3", w: 12, h: 9 },
  { id: "16x9", label: "16×9", hint: "Widescreen", w: 16, h: 9 },
  { id: "16x10", label: "16×10", hint: "Cinema", w: 16, h: 10 },
  { id: "9x16", label: "9×16", hint: "Portrait", w: 9, h: 16 },
]

/** @deprecated Prefer PLOT_PRESETS + free W×H. Kept for seed/local migration. */
export const SIZE_TIERS = {
  S: { key: "S", label: "Small", units: 3, price: 9 },
  M: { key: "M", label: "Medium", units: 5, price: 25 },
  L: { key: "L", label: "Large", units: 10, price: 100 },
} as const

export type SizeTier = keyof typeof SIZE_TIERS

export function plotArea(w: number, h: number): number {
  return w * h
}

/** $1 per square unit — 3×3 → $9, 16×10 → $160, 100×100 → $10,000. */
export function plotPrice(w: number, h: number): number {
  return plotArea(w, h)
}

export function unitsToPx(units: number): number {
  return units * UNIT_SCALE
}

export function formatPlot(w: number, h: number): string {
  return `${w}×${h}`
}

export function plotAspectRatio(w: number, h: number): number {
  const longer = Math.max(w, h)
  const shorter = Math.min(w, h)
  if (shorter <= 0) return Number.POSITIVE_INFINITY
  return longer / shorter
}

export function isValidPlot(w: number, h: number): boolean {
  if (!Number.isInteger(w) || !Number.isInteger(h)) return false
  if (w < PLOT_MIN || h < PLOT_MIN || w > PLOT_MAX || h > PLOT_MAX) {
    return false
  }
  return plotAspectRatio(w, h) <= PLOT_MAX_RATIO + 1e-9
}

export type PlotValidation =
  | { ok: true }
  | { ok: false; reason: string }

export function validatePlot(w: number, h: number): PlotValidation {
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return { ok: false, reason: "Enter whole numbers for width and height." }
  }
  if (!Number.isInteger(w) || !Number.isInteger(h)) {
    return { ok: false, reason: "Width and height must be whole numbers." }
  }
  if (w < PLOT_MIN || h < PLOT_MIN) {
    return { ok: false, reason: `Minimum plot size is ${PLOT_MIN}×${PLOT_MIN}.` }
  }
  if (w > PLOT_MAX || h > PLOT_MAX) {
    return { ok: false, reason: `Each side can be at most ${PLOT_MAX}.` }
  }
  if (plotAspectRatio(w, h) > PLOT_MAX_RATIO + 1e-9) {
    return {
      ok: false,
      reason: "Max aspect ratio is 16:9 — try a less elongated plot.",
    }
  }
  return { ok: true }
}

/**
 * Allowed range for one side given the other, so the pair stays within
 * PLOT_MIN–PLOT_MAX and the 16:9 max aspect. Example: other=100 → min≈57.
 */
export function plotSideBounds(other: number | null): {
  min: number
  max: number
} {
  let min = PLOT_MIN
  let max = PLOT_MAX
  if (
    other != null &&
    Number.isFinite(other) &&
    other >= PLOT_MIN &&
    other <= PLOT_MAX
  ) {
    min = Math.max(PLOT_MIN, Math.ceil(other / PLOT_MAX_RATIO))
    max = Math.min(PLOT_MAX, Math.floor(other * PLOT_MAX_RATIO))
  }
  return { min, max }
}

export function fieldWarning(
  value: number | null,
  other: number | null,
  axis: "width" | "height"
): string | null {
  if (value == null) return null
  const { min, max } = plotSideBounds(other)
  if (value > PLOT_MAX) return `Maximum is ${PLOT_MAX}`
  if (value < PLOT_MIN) return `Minimum is ${PLOT_MIN}`
  if (other != null && value < min) {
    return `Minimum is ${min} (16:9 with ${axis === "width" ? "height" : "width"} ${other})`
  }
  if (other != null && value > max) {
    return `Maximum is ${max} (16:9 with ${axis === "width" ? "height" : "width"} ${other})`
  }
  return null
}

/** @deprecated Use unitsToPx with free plot sizes. */
export function sizePx(tier: SizeTier): number {
  return SIZE_TIERS[tier].units * UNIT_SCALE
}

/** Directory / wall listing: one sticker = one identity + artwork. */
export type Sticker = {
  id: string
  /** Public URL segment; falls back to id for older local placements. */
  slug: string
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
  /** Plot width in pricing units. */
  unitsW: number
  /** Plot height in pricing units. */
  unitsH: number
  /**
   * Legacy S/M/L from older local saves. Prefer unitsW/unitsH.
   * @deprecated
   */
  sizeTier?: SizeTier
  createdAt: string
}

export const STICKER_STYLES = [
  "none",
  "classic",
  "stamp",
  "rough",
  "square",
  "rounded",
  "circle",
] as const
export type StickerStyle = (typeof STICKER_STYLES)[number]

export const STICKER_FILTERS = [
  "original",
  "glitter",
  "hologram",
  "aurora",
  "sunset",
  "ocean",
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
  unitsW: number
  unitsH: number
  details: StickerDetails
}
