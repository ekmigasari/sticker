/** Wall pixels per pricing unit (3×3 units → 30×30 on canvas). */
export const UNIT_SCALE = 10
/**
 * Wall side in pricing units. Square is intentional: portrait and landscape
 * get equal coverage with cover-fit zoom (fill the screen, crop the long side).
 */
export const WALL_UNITS = 1000
/** Wall side in world pixels. */
export const WALL_SIZE = WALL_UNITS * UNIT_SCALE
/** Default camera shows this many units of wall height on screen. */
export const DEFAULT_VIEW_UNITS = 100

/** Zoom that fully covers the viewport with the wall (no empty gutters). */
export function coverZoom(viewportW: number, viewportH: number): number {
  if (viewportW <= 0 || viewportH <= 0) return 1
  return Math.max(viewportW / WALL_SIZE, viewportH / WALL_SIZE)
}

/** Axis-aligned bounds of a box rotated around its center. */
export function rotatedBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg = 0
): { left: number; top: number; width: number; height: number } {
  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const bw = w * cos + h * sin
  const bh = w * sin + h * cos
  const cx = x + w / 2
  const cy = y + h / 2
  return { left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh }
}

export function fitsOnWall(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg = 0
): boolean {
  const b = rotatedBounds(x, y, w, h, rotationDeg)
  return (
    b.left >= -1e-6 &&
    b.top >= -1e-6 &&
    b.left + b.width <= WALL_SIZE + 1e-6 &&
    b.top + b.height <= WALL_SIZE + 1e-6
  )
}

/** Keep a (possibly rotated) plot fully inside the wall. */
export function clampOnWall(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg = 0
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const bw = w * cos + h * sin
  const bh = w * sin + h * cos
  if (bw > WALL_SIZE || bh > WALL_SIZE) {
    return { x: (WALL_SIZE - w) / 2, y: (WALL_SIZE - h) / 2 }
  }
  const cx = x + w / 2
  const cy = y + h / 2
  const ncx = Math.min(WALL_SIZE - bw / 2, Math.max(bw / 2, cx))
  const ncy = Math.min(WALL_SIZE - bh / 2, Math.max(bh / 2, cy))
  return { x: ncx - w / 2, y: ncy - h / 2 }
}

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

export function pxToUnits(px: number): number {
  return Math.round(px / UNIT_SCALE)
}

/**
 * Snap a plot origin to whole grid cells. Plots are sold as unit rectangles —
 * never half-cells.
 */
export function snapPlotOrigin(
  x: number,
  y: number,
  unitsW: number,
  unitsH: number
): { x: number; y: number } {
  const maxUx = WALL_SIZE / UNIT_SCALE - unitsW
  const maxUy = WALL_SIZE / UNIT_SCALE - unitsH
  const ux = Math.min(
    Math.max(0, Math.round(x / UNIT_SCALE)),
    Math.max(0, maxUx)
  )
  const uy = Math.min(
    Math.max(0, Math.round(y / UNIT_SCALE)),
    Math.max(0, maxUy)
  )
  return { x: ux * UNIT_SCALE, y: uy * UNIT_SCALE }
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

export type PlotValidation = { ok: true } | { ok: false; reason: string }

export function validatePlot(w: number, h: number): PlotValidation {
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return { ok: false, reason: "Enter whole numbers for width and height." }
  }
  if (!Number.isInteger(w) || !Number.isInteger(h)) {
    return { ok: false, reason: "Width and height must be whole numbers." }
  }
  if (w < PLOT_MIN || h < PLOT_MIN) {
    return {
      ok: false,
      reason: `Minimum plot size is ${PLOT_MIN}×${PLOT_MIN}.`,
    }
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
  /** Intrinsic pixel size of artwork when known. */
  widthPx?: number
  heightPx?: number
  createdAt: string
}

export type Placement = {
  id: string
  stickerId: string
  /** Plot top-left (axis-aligned; never rotated). */
  x: number
  y: number
  /** Plot width in wall px (= unitsW × UNIT_SCALE). */
  width: number
  /** Plot height in wall px (= unitsH × UNIT_SCALE). */
  height: number
  zIndex: number
  /** Plot width in pricing units — used for price + coverage. */
  unitsW: number
  /** Plot height in pricing units — used for price + coverage. */
  unitsH: number
  /**
   * Visual sticker scale inside the plot (0.2–1). Default 1.
   * Does not affect pricing or coverage.
   */
  stickerScale?: number
  /**
   * Visual sticker rotation in degrees (artwork only).
   * Plot area stays axis-aligned.
   */
  rotation?: number
  /** Sticker center offset from plot center (wall px). Default 0. */
  stickerOffsetX?: number
  stickerOffsetY?: number
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
  /** Intrinsic pixel size of `imageDataUrl` (for resolution + aspect). */
  widthPx?: number
  heightPx?: number
  /** Print size chosen in Make (mm, longest side). Drives default wall size. */
  sizeMm?: number
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
  /** Plot size in pricing units (axis-aligned). */
  unitsW: number
  unitsH: number
  /** Plot top-left on the wall. */
  x?: number
  y?: number
  /** Visual sticker scale inside the plot (0.2–1). */
  stickerScale?: number
  /** Visual sticker rotation only (degrees). Plot does not rotate. */
  rotation?: number
  /** Sticker center offset from plot center (wall px). Default 0. */
  stickerOffsetX?: number
  stickerOffsetY?: number
  /** Filled after sign-in on the details form. */
  details?: StickerDetails
}

/** Min/max visual sticker scale inside a plot. 1 = fill the plot (contain). */
export const STICKER_SCALE_MIN = 0.2
export const STICKER_SCALE_MAX = 1
/**
 * Geometric ceiling for scale. Scale is relative to the *unrotated* contain-fit,
 * so a rotated sticker in a plot shaped around it (e.g. wide art at 90° in a
 * tall plot) legitimately needs scale > 1.
 */
export const STICKER_SCALE_FIT_MAX = 8
/** Sticker-mode size slider: longest side of the artwork, in pricing units. */
export const STICKER_SIZE_MIN = PLOT_MIN
export const STICKER_SIZE_MAX = PLOT_MAX

export type PlotCorner = "nw" | "ne" | "sw" | "se"
/** Figma-style resize handles: 4 corners + 4 edges. */
export type PlotHandle = PlotCorner | "n" | "e" | "s" | "w"

/** Width ÷ height. Falls back to square when unknown. */
export function contentAspectRatio(
  widthPx?: number | null,
  heightPx?: number | null
): number {
  if (
    widthPx != null &&
    heightPx != null &&
    widthPx > 0 &&
    heightPx > 0 &&
    Number.isFinite(widthPx) &&
    Number.isFinite(heightPx)
  ) {
    return widthPx / heightPx
  }
  return 1
}

/**
 * Largest unrotated sticker that contain-fits inside a plot (aspect-correct).
 * Fills the plot on at least one axis — no artificial rotate padding.
 */
export function containStickerSize(
  plotW: number,
  plotH: number,
  contentAspect = 1
): { w: number; h: number } {
  const a =
    contentAspect > 0 && Number.isFinite(contentAspect) ? contentAspect : 1
  const plotAspect = plotW / Math.max(1e-9, plotH)
  if (a >= plotAspect) {
    const w = plotW
    return { w, h: w / a }
  }
  const h = plotH
  return { w: h * a, h }
}

/**
 * Unrotated sticker box inside a plot at the given scale.
 * Scale 1 = max contain-fit (touches the plot on the limiting side).
 */
export function stickerBoxSize(
  plotW: number,
  plotH: number,
  scale: number,
  contentAspect = 1
): { w: number; h: number } {
  const s = Math.min(STICKER_SCALE_FIT_MAX, Math.max(STICKER_SCALE_MIN, scale))
  const full = containStickerSize(plotW, plotH, contentAspect)
  return { w: full.w * s, h: full.h * s }
}

/** Content size in pricing units where `size` is the longest side. */
export function stickerContentUnits(
  size: number,
  contentAspect = 1
): { unitsW: number; unitsH: number } {
  const a =
    contentAspect > 0 && Number.isFinite(contentAspect) ? contentAspect : 1
  const long = Math.min(STICKER_SIZE_MAX, Math.max(STICKER_SIZE_MIN, size))
  if (a >= 1) return { unitsW: long, unitsH: long / a }
  return { unitsW: long * a, unitsH: long }
}

/** Inverse of {@link stickerContentUnits}: the longest side, clamped. */
export function sizeParamFromContentUnits(
  unitsW: number,
  unitsH: number
): number {
  const long = Math.max(unitsW, unitsH)
  if (!(long > 0)) return STICKER_SIZE_MIN
  return Math.min(STICKER_SIZE_MAX, Math.max(STICKER_SIZE_MIN, long))
}

/**
 * Default sticker-mode size from the Make print size (mm, longest side).
 * SIZE_MAX_MM maps to PLOT_MAX; smaller prints stay sharp when placed smaller.
 */
export function defaultStickerSizeFromMm(sizeMm: number): number {
  if (!Number.isFinite(sizeMm) || sizeMm <= 0) return 8
  const long = Math.round((sizeMm * STICKER_SIZE_MAX) / 500)
  return Math.min(STICKER_SIZE_MAX, Math.max(STICKER_SIZE_MIN, long))
}

/**
 * Axis-aligned bounds of the sticker box inside a plot
 * (relative to plot top-left).
 */
export function stickerAabbInPlot(
  plotW: number,
  plotH: number,
  scale: number,
  rotationDeg: number,
  offsetX = 0,
  offsetY = 0,
  contentAspect = 1
): { left: number; top: number; width: number; height: number } {
  const { w, h } = stickerBoxSize(plotW, plotH, scale, contentAspect)
  const cx = plotW / 2 + offsetX
  const cy = plotH / 2 + offsetY
  return rotatedBounds(cx - w / 2, cy - h / 2, w, h, rotationDeg)
}

function stickerFitsInPlot(
  plotW: number,
  plotH: number,
  scale: number,
  rotationDeg: number,
  offsetX: number,
  offsetY: number,
  contentAspect: number
): boolean {
  const b = stickerAabbInPlot(
    plotW,
    plotH,
    scale,
    rotationDeg,
    offsetX,
    offsetY,
    contentAspect
  )
  // Slightly stricter than display epsilon so binary-searched rotations
  // don't land a hair outside from float error.
  const pad = 1e-4
  return (
    b.left >= -pad &&
    b.top >= -pad &&
    b.left + b.width <= plotW + pad &&
    b.top + b.height <= plotH + pad
  )
}

/**
 * Largest scale ∈ [STICKER_SCALE_MIN, STICKER_SCALE_MAX] whose rotated
 * sticker box (at the given offset) fits inside the plot.
 */
export function maxScaleThatFits(
  plotW: number,
  plotH: number,
  rotationDeg: number,
  offsetX = 0,
  offsetY = 0,
  contentAspect = 1
): number {
  if (plotW <= 0 || plotH <= 0) return STICKER_SCALE_MIN
  let lo = STICKER_SCALE_MIN
  let hi = STICKER_SCALE_FIT_MAX
  const fits = (scale: number) =>
    stickerFitsInPlot(
      plotW,
      plotH,
      scale,
      rotationDeg,
      offsetX,
      offsetY,
      contentAspect
    )
  if (!fits(lo)) {
    // Even min scale overflows at this offset — caller should nudge offset.
    return STICKER_SCALE_MIN
  }
  if (fits(hi)) return hi
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Clamp sticker scale + offset so the rotated AABB never crosses any plot
 * edge (top / bottom / left / right / diagonal corners).
 */
export function clampStickerInPlot(
  plotW: number,
  plotH: number,
  scale: number,
  rotationDeg: number,
  offsetX = 0,
  offsetY = 0,
  contentAspect = 1
): { scale: number; offsetX: number; offsetY: number } {
  let nextScale = Math.min(
    STICKER_SCALE_FIT_MAX,
    Math.max(STICKER_SCALE_MIN, scale)
  )
  // First fit at center, then place offset inside the remaining slack.
  nextScale = Math.min(
    nextScale,
    maxScaleThatFits(plotW, plotH, rotationDeg, 0, 0, contentAspect)
  )

  const { w, h } = stickerBoxSize(plotW, plotH, nextScale, contentAspect)
  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const bw = w * cos + h * sin
  const bh = w * sin + h * cos
  const maxOx = Math.max(0, (plotW - bw) / 2)
  const maxOy = Math.max(0, (plotH - bh) / 2)
  let nextOx = Math.min(maxOx, Math.max(-maxOx, offsetX))
  let nextOy = Math.min(maxOy, Math.max(-maxOy, offsetY))

  // If offset still overflows (e.g. min scale), shrink further then re-clamp.
  nextScale = Math.min(
    nextScale,
    maxScaleThatFits(plotW, plotH, rotationDeg, nextOx, nextOy, contentAspect)
  )
  const box2 = stickerBoxSize(plotW, plotH, nextScale, contentAspect)
  const bw2 = box2.w * cos + box2.h * sin
  const bh2 = box2.w * sin + box2.h * cos
  const maxOx2 = Math.max(0, (plotW - bw2) / 2)
  const maxOy2 = Math.max(0, (plotH - bh2) / 2)
  nextOx = Math.min(maxOx2, Math.max(-maxOx2, nextOx))
  nextOy = Math.min(maxOy2, Math.max(-maxOy2, nextOy))

  return { scale: nextScale, offsetX: nextOx, offsetY: nextOy }
}

/**
 * Closest rotation to `targetDeg` (from `fromDeg`) that still fits the sticker
 * inside the plot at the given scale — used so rotate stops at the border
 * instead of shrinking the artwork.
 */
export function clampRotationInPlot(
  plotW: number,
  plotH: number,
  scale: number,
  fromDeg: number,
  targetDeg: number,
  offsetX = 0,
  offsetY = 0,
  contentAspect = 1
): number {
  if (
    stickerFitsInPlot(
      plotW,
      plotH,
      scale,
      targetDeg,
      offsetX,
      offsetY,
      contentAspect
    )
  ) {
    return targetDeg
  }
  if (
    !stickerFitsInPlot(
      plotW,
      plotH,
      scale,
      fromDeg,
      offsetX,
      offsetY,
      contentAspect
    )
  ) {
    // Already overflowing — fall back to whatever still fits near 0.
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      const deg = fromDeg + (targetDeg - fromDeg) * mid
      if (
        stickerFitsInPlot(
          plotW,
          plotH,
          scale,
          deg,
          offsetX,
          offsetY,
          contentAspect
        )
      ) {
        lo = mid
      } else {
        hi = mid
      }
    }
    return fromDeg + (targetDeg - fromDeg) * lo
  }
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const deg = fromDeg + (targetDeg - fromDeg) * mid
    if (
      stickerFitsInPlot(
        plotW,
        plotH,
        scale,
        deg,
        offsetX,
        offsetY,
        contentAspect
      )
    ) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return fromDeg + (targetDeg - fromDeg) * lo
}

/**
 * Whether a plot covering the rotated sticker can sit on the wall with its
 * centre at (cx, cy) — used to limit sticker-mode rotation at the wall edge.
 */
export function stickerPlotFitsAtCenter(
  cx: number,
  cy: number,
  contentW: number,
  contentH: number,
  rotationDeg: number
): boolean {
  const needed = plotUnitsForSticker(contentW, contentH, rotationDeg)
  const w = unitsToPx(needed.unitsW)
  const h = unitsToPx(needed.unitsH)
  if (w > WALL_SIZE + 1e-6 || h > WALL_SIZE + 1e-6) return false
  const x = cx - w / 2
  const y = cy - h / 2
  return (
    x >= -1e-6 &&
    y >= -1e-6 &&
    x + w <= WALL_SIZE + 1e-6 &&
    y + h <= WALL_SIZE + 1e-6
  )
}

/**
 * Plot origin centred on (cx, cy), snapped to the pricing grid and clamped
 * inside the wall. Prefer rejecting oversized rotations over shoving the plot.
 */
export function plotOriginCentered(
  cx: number,
  cy: number,
  unitsW: number,
  unitsH: number
): { x: number; y: number } {
  const w = unitsToPx(unitsW)
  const h = unitsToPx(unitsH)
  return snapPlotOrigin(cx - w / 2, cy - h / 2, unitsW, unitsH)
}

/**
 * Plot units that cover a sticker of the given unrotated display size
 * after rotation. Ceils to whole cells and enforces min/max + 16:9.
 */
export function plotUnitsForSticker(
  contentW: number,
  contentH: number,
  rotationDeg = 0
): { unitsW: number; unitsH: number } {
  const b = rotatedBounds(
    0,
    0,
    Math.max(1, contentW),
    Math.max(1, contentH),
    rotationDeg
  )
  let unitsW = Math.max(PLOT_MIN, Math.ceil(b.width / UNIT_SCALE - 1e-9))
  let unitsH = Math.max(PLOT_MIN, Math.ceil(b.height / UNIT_SCALE - 1e-9))
  unitsW = Math.min(PLOT_MAX, unitsW)
  unitsH = Math.min(PLOT_MAX, unitsH)

  // Fix aspect if over 16:9 by growing the shorter side.
  if (plotAspectRatio(unitsW, unitsH) > PLOT_MAX_RATIO + 1e-9) {
    if (unitsW >= unitsH) {
      unitsH = Math.max(PLOT_MIN, Math.ceil(unitsW / PLOT_MAX_RATIO))
      if (unitsH > PLOT_MAX) {
        unitsH = PLOT_MAX
        unitsW = Math.min(PLOT_MAX, Math.floor(unitsH * PLOT_MAX_RATIO))
      }
    } else {
      unitsW = Math.max(PLOT_MIN, Math.ceil(unitsH / PLOT_MAX_RATIO))
      if (unitsW > PLOT_MAX) {
        unitsW = PLOT_MAX
        unitsH = Math.min(PLOT_MAX, Math.floor(unitsW * PLOT_MAX_RATIO))
      }
    }
  }

  if (!validatePlot(unitsW, unitsH).ok) {
    return { unitsW: PLOT_MIN, unitsH: PLOT_MIN }
  }
  return { unitsW, unitsH }
}

/**
 * Resize a grid-snapped plot from a corner or edge handle.
 * Invalid sizes return null (caller keeps previous).
 */
export function resizePlotFromHandle(
  handle: PlotHandle,
  originX: number,
  originY: number,
  unitsW: number,
  unitsH: number,
  dx: number,
  dy: number
): { x: number; y: number; unitsW: number; unitsH: number } | null {
  const left = originX
  const top = originY
  const right = originX + unitsToPx(unitsW)
  const bottom = originY + unitsToPx(unitsH)

  let nextLeft = left
  let nextTop = top
  let nextRight = right
  let nextBottom = bottom

  if (handle === "se" || handle === "e" || handle === "ne") {
    nextRight = right + dx
  }
  if (handle === "sw" || handle === "w" || handle === "nw") {
    nextLeft = left + dx
  }
  if (handle === "se" || handle === "s" || handle === "sw") {
    nextBottom = bottom + dy
  }
  if (handle === "ne" || handle === "n" || handle === "nw") {
    nextTop = top + dy
  }
  // Pure edge handles only move that axis.
  if (handle === "e" || handle === "w") {
    nextTop = top
    nextBottom = bottom
  }
  if (handle === "n" || handle === "s") {
    nextLeft = left
    nextRight = right
  }

  // Snap edges to grid.
  const snap = (v: number) => Math.round(v / UNIT_SCALE) * UNIT_SCALE
  nextLeft = snap(nextLeft)
  nextTop = snap(nextTop)
  nextRight = snap(nextRight)
  nextBottom = snap(nextBottom)

  nextLeft = Math.max(0, Math.min(nextLeft, WALL_SIZE - unitsToPx(PLOT_MIN)))
  nextTop = Math.max(0, Math.min(nextTop, WALL_SIZE - unitsToPx(PLOT_MIN)))
  nextRight = Math.max(unitsToPx(PLOT_MIN), Math.min(WALL_SIZE, nextRight))
  nextBottom = Math.max(unitsToPx(PLOT_MIN), Math.min(WALL_SIZE, nextBottom))

  const growsRight = handle === "se" || handle === "e" || handle === "ne"
  const growsDown = handle === "se" || handle === "s" || handle === "sw"

  if (nextRight - nextLeft < unitsToPx(PLOT_MIN)) {
    if (growsRight) nextRight = nextLeft + unitsToPx(PLOT_MIN)
    else nextLeft = nextRight - unitsToPx(PLOT_MIN)
  }
  if (nextBottom - nextTop < unitsToPx(PLOT_MIN)) {
    if (growsDown) nextBottom = nextTop + unitsToPx(PLOT_MIN)
    else nextTop = nextBottom - unitsToPx(PLOT_MIN)
  }

  let nextW = Math.round((nextRight - nextLeft) / UNIT_SCALE)
  let nextH = Math.round((nextBottom - nextTop) / UNIT_SCALE)
  nextW = Math.min(PLOT_MAX, Math.max(PLOT_MIN, nextW))
  nextH = Math.min(PLOT_MAX, Math.max(PLOT_MIN, nextH))

  if (!validatePlot(nextW, nextH).ok) return null

  const pos = snapPlotOrigin(nextLeft, nextTop, nextW, nextH)
  // Ensure size still fits from snapped origin.
  const maxW = Math.floor((WALL_SIZE - pos.x) / UNIT_SCALE)
  const maxH = Math.floor((WALL_SIZE - pos.y) / UNIT_SCALE)
  nextW = Math.min(nextW, maxW)
  nextH = Math.min(nextH, maxH)
  if (!validatePlot(nextW, nextH).ok) return null

  return { x: pos.x, y: pos.y, unitsW: nextW, unitsH: nextH }
}

/** @deprecated Prefer {@link resizePlotFromHandle}. */
export function resizePlotFromCorner(
  corner: PlotCorner,
  originX: number,
  originY: number,
  unitsW: number,
  unitsH: number,
  dx: number,
  dy: number
): { x: number; y: number; unitsW: number; unitsH: number } | null {
  return resizePlotFromHandle(corner, originX, originY, unitsW, unitsH, dx, dy)
}

/**
 * Place a plot around a fixed world centre. Keeps the centre stable (no snap
 * crawl) and only clamps when the plot would leave the wall.
 */
export function plotOriginAtCenter(
  cx: number,
  cy: number,
  unitsW: number,
  unitsH: number
): { x: number; y: number } {
  const w = unitsToPx(unitsW)
  const h = unitsToPx(unitsH)
  let x = cx - w / 2
  let y = cy - h / 2
  x = Math.min(Math.max(0, x), Math.max(0, WALL_SIZE - w))
  y = Math.min(Math.max(0, y), Math.max(0, WALL_SIZE - h))
  return { x, y }
}

/** Keep a plot inside the wall without grid snapping (for live dragging). */
export function clampPlotOrigin(
  x: number,
  y: number,
  unitsW: number,
  unitsH: number
): { x: number; y: number } {
  const w = unitsToPx(unitsW)
  const h = unitsToPx(unitsH)
  return {
    x: Math.min(Math.max(0, x), Math.max(0, WALL_SIZE - w)),
    y: Math.min(Math.max(0, y), Math.max(0, WALL_SIZE - h)),
  }
}

type Rect = { x: number; y: number; w: number; h: number }

function asRect(p: {
  x: number
  y: number
  width: number
  height: number
}): Rect {
  return { x: p.x, y: p.y, w: p.width, h: p.height }
}

function containsRect(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x + 1e-6 &&
    outer.y <= inner.y + 1e-6 &&
    outer.x + outer.w >= inner.x + inner.w - 1e-6 &&
    outer.y + outer.h >= inner.y + inner.h - 1e-6
  )
}

/** Subtract `cut` from `rect`, returning remaining axis-aligned pieces. */
function subtractRect(rect: Rect, cut: Rect): Rect[] {
  const x1 = Math.max(rect.x, cut.x)
  const y1 = Math.max(rect.y, cut.y)
  const x2 = Math.min(rect.x + rect.w, cut.x + cut.w)
  const y2 = Math.min(rect.y + rect.h, cut.y + cut.h)
  if (x2 <= x1 || y2 <= y1) return [rect]

  const out: Rect[] = []
  // Top
  if (y1 > rect.y) {
    out.push({ x: rect.x, y: rect.y, w: rect.w, h: y1 - rect.y })
  }
  // Bottom
  if (y2 < rect.y + rect.h) {
    out.push({
      x: rect.x,
      y: y2,
      w: rect.w,
      h: rect.y + rect.h - y2,
    })
  }
  // Left
  if (x1 > rect.x) {
    out.push({ x: rect.x, y: y1, w: x1 - rect.x, h: y2 - y1 })
  }
  // Right
  if (x2 < rect.x + rect.w) {
    out.push({ x: x2, y: y1, w: rect.x + rect.w - x2, h: y2 - y1 })
  }
  return out.filter((r) => r.w > 1e-6 && r.h > 1e-6)
}

/**
 * True when the plot is 100% covered by higher-z placements' plot areas.
 * Covered plots should not render their sticker artwork.
 */
export function isPlotFullyCovered(
  target: {
    x: number
    y: number
    width: number
    height: number
    zIndex: number
  },
  all: ReadonlyArray<{
    x: number
    y: number
    width: number
    height: number
    zIndex: number
  }>
): boolean {
  const above = all.filter((p) => p.zIndex > target.zIndex)
  if (!above.length) return false
  if (above.some((p) => containsRect(asRect(p), asRect(target)))) return true

  let remaining: Rect[] = [asRect(target)]
  for (const cover of above) {
    const cut = asRect(cover)
    remaining = remaining.flatMap((r) => subtractRect(r, cut))
    if (!remaining.length) return true
  }
  return remaining.length === 0
}
