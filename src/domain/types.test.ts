import { describe, expect, it } from "vitest"
import {
  PLOT_MAX,
  PLOT_MIN,
  SIZE_TIERS,
  STICKER_SIZE_MAX,
  STICKER_SIZE_MIN,
  UNIT_SCALE,
  WALL_SIZE,
  WALL_UNITS,
  clampOnWall,
  clampRotationInPlot,
  clampStickerInPlot,
  containStickerSize,
  coverZoom,
  defaultStickerSizeFromMm,
  fieldWarning,
  fitsOnWall,
  formatPlot,
  isOfferExpired,
  isValidPlot,
  maxScaleThatFits,
  normalizeCategory,
  plotCoverage,
  plotPrice,
  plotVisibility,
  plotOriginContaining,
  plotSideBounds,
  plotUnitsForSticker,
  plotUnitsWithFloor,
  RESTORE_MIN_PRICE,
  coveredUnits,
  restorePrice,
  visibleAreaShare,
  resizePlotFromCorner,
  resizePlotFromHandle,
  sizeParamFromContentUnits,
  sizePx,
  snapPlotOrigin,
  stickerAabbInPlot,
  stickerBoxSize,
  stickerContentUnits,
  uncoveredPlacements,
  unitsToPx,
  validatePlot,
} from "./types"

describe("sticker wall sizing", () => {
  it("keeps a square 1000×1000-unit world for equal portrait/landscape cover", () => {
    expect(WALL_UNITS).toBe(1000)
    expect(WALL_SIZE).toBe(WALL_UNITS * UNIT_SCALE)
  })

  it("cover-zooms to fill the viewport without gutters", () => {
    // Portrait phone: height dominates
    expect(coverZoom(390, 844)).toBeCloseTo(844 / WALL_SIZE)
    // Landscape phone: width dominates
    expect(coverZoom(844, 390)).toBeCloseTo(844 / WALL_SIZE)
    // Square viewport
    expect(coverZoom(WALL_SIZE, WALL_SIZE)).toBe(1)
  })

  it("keeps rotated plots inside the wall", () => {
    const pos = clampOnWall(0, 0, 50, 50, 45)
    expect(fitsOnWall(pos.x, pos.y, 50, 50, 45)).toBe(true)
    expect(fitsOnWall(-10, -10, 50, 50, 0)).toBe(false)
  })

  it("prices plots at $1 per square unit", () => {
    expect(plotPrice(3, 3)).toBe(9)
    expect(plotPrice(16, 10)).toBe(160)
    expect(plotPrice(100, 100)).toBe(10_000)
    expect(SIZE_TIERS.S.price).toBe(SIZE_TIERS.S.units ** 2)
  })

  it("scales wall pixels from pricing units", () => {
    expect(unitsToPx(3)).toBe(3 * UNIT_SCALE)
    expect(unitsToPx(16)).toBe(16 * UNIT_SCALE)
    expect(sizePx("S")).toBe(3 * UNIT_SCALE)
  })

  it("enforces min, max, and 16:9 aspect ratio", () => {
    expect(isValidPlot(PLOT_MIN, PLOT_MIN)).toBe(true)
    expect(isValidPlot(PLOT_MAX, PLOT_MAX)).toBe(true)
    expect(isValidPlot(16, 9)).toBe(true)
    expect(isValidPlot(9, 16)).toBe(true)
    expect(isValidPlot(2, 3)).toBe(false)
    expect(isValidPlot(1, 100)).toBe(false)
    expect(isValidPlot(100, 1)).toBe(false)
    expect(isValidPlot(101, 101)).toBe(false)
    expect(validatePlot(1, 100).ok).toBe(false)
  })

  it("formats plot labels", () => {
    expect(formatPlot(16, 10)).toBe("16×10")
  })

  it("computes side bounds from the other dimension", () => {
    expect(plotSideBounds(100).min).toBe(57)
    expect(plotSideBounds(100).max).toBe(100)
    expect(plotSideBounds(3).min).toBe(3)
    expect(fieldWarning(50, 100, "width")).toMatch(/Minimum is 57/)
    expect(fieldWarning(101, 5, "height")).toMatch(/Maximum is 100/)
  })

  it("snaps plot origin to whole unit cells", () => {
    expect(snapPlotOrigin(14, 26, 3, 3)).toEqual({ x: 10, y: 30 })
    expect(snapPlotOrigin(-8, 4, 3, 3)).toEqual({ x: 0, y: 0 })
    expect(snapPlotOrigin(WALL_SIZE - 10, WALL_SIZE - 10, 3, 3)).toEqual({
      x: WALL_SIZE - 30,
      y: WALL_SIZE - 30,
    })
  })

  it("derives plot units that cover a rotated sticker", () => {
    const square = plotUnitsForSticker(30, 30, 0)
    expect(square).toEqual({ unitsW: 3, unitsH: 3 })
    const rotated = plotUnitsForSticker(30, 30, 45)
    expect(rotated.unitsW).toBeGreaterThanOrEqual(3)
    expect(rotated.unitsH).toBeGreaterThanOrEqual(3)
    expect(isValidPlot(rotated.unitsW, rotated.unitsH)).toBe(true)
  })

  it("clamps sticker scale when the area shrinks", () => {
    const large = maxScaleThatFits(100, 100, 0, 0, 0)
    expect(large).toBeCloseTo(1, 3)
    const tight = maxScaleThatFits(30, 30, 45, 0, 0)
    expect(tight).toBeLessThan(1)
    const clamped = clampStickerInPlot(30, 30, 1, 45, 20, 20)
    expect(clamped.scale).toBeLessThanOrEqual(tight + 1e-6)
    const aabb = stickerAabbInPlot(
      30,
      30,
      clamped.scale,
      45,
      clamped.offsetX,
      clamped.offsetY
    )
    expect(aabb.left).toBeGreaterThanOrEqual(-1e-3)
    expect(aabb.top).toBeGreaterThanOrEqual(-1e-3)
    expect(aabb.left + aabb.width).toBeLessThanOrEqual(30 + 1e-3)
    expect(aabb.top + aabb.height).toBeLessThanOrEqual(30 + 1e-3)
  })

  it("contain-fits stickers to the plot without fake square padding", () => {
    const wide = containStickerSize(100, 50, 2)
    expect(wide.w).toBeCloseTo(100)
    expect(wide.h).toBeCloseTo(50)
    const tall = containStickerSize(100, 100, 0.5)
    expect(tall.w).toBeCloseTo(50)
    expect(tall.h).toBeCloseTo(100)
    const box = stickerBoxSize(100, 100, 1, 2)
    expect(box.w).toBeCloseTo(100)
    expect(box.h).toBeCloseTo(50)
  })

  it("maps the sticker size slider to the longest side", () => {
    expect(STICKER_SIZE_MIN).toBe(3)
    expect(STICKER_SIZE_MAX).toBe(100)

    const sq = stickerContentUnits(40, 1)
    expect(sq).toEqual({ unitsW: 40, unitsH: 40 })

    const wide = stickerContentUnits(40, 2)
    expect(wide.unitsW).toBeCloseTo(40)
    expect(wide.unitsH).toBeCloseTo(20)

    const tall = stickerContentUnits(STICKER_SIZE_MIN, 0.5)
    expect(tall.unitsH).toBeCloseTo(PLOT_MIN)
    expect(tall.unitsW).toBeCloseTo(1.5)

    const maxWide = stickerContentUnits(500, 2)
    expect(maxWide.unitsW).toBeCloseTo(PLOT_MAX)
    expect(sizeParamFromContentUnits(maxWide.unitsW, maxWide.unitsH)).toBe(
      STICKER_SIZE_MAX
    )
    expect(sizeParamFromContentUnits(12, 30)).toBe(30)
    expect(defaultStickerSizeFromMm(500)).toBe(PLOT_MAX)
    expect(defaultStickerSizeFromMm(54)).toBeGreaterThanOrEqual(PLOT_MIN)
  })

  it("keeps a wide sticker the same size when rotated 90°", () => {
    const needed = plotUnitsForSticker(400, 200, 90)
    const plotW = unitsToPx(needed.unitsW)
    const plotH = unitsToPx(needed.unitsH)
    const fit = maxScaleThatFits(plotW, plotH, 90, 0, 0, 2)
    const box = stickerBoxSize(plotW, plotH, fit, 2)
    expect(box.w).toBeCloseTo(400, 0)
    expect(box.h).toBeCloseTo(200, 0)
    const clamped = clampStickerInPlot(plotW, plotH, fit, 90, 0, 0, 2)
    expect(clamped.scale).toBeCloseTo(fit, 3)
  })

  it("limits rotation inside a plot instead of always shrinking", () => {
    const limited = clampRotationInPlot(30, 30, 1, 0, 45, 0, 0, 1)
    expect(Math.abs(limited)).toBeLessThan(45)
    const aabb = stickerAabbInPlot(30, 30, 1, limited, 0, 0, 1)
    expect(aabb.left).toBeGreaterThanOrEqual(-1e-3)
    expect(aabb.top).toBeGreaterThanOrEqual(-1e-3)
    expect(aabb.left + aabb.width).toBeLessThanOrEqual(30 + 1e-3)
    expect(aabb.top + aabb.height).toBeLessThanOrEqual(30 + 1e-3)
  })

  it("resizes plots from every corner on the grid", () => {
    const se = resizePlotFromCorner("se", 100, 100, 3, 3, 40, 20)
    expect(se).not.toBeNull()
    expect(se!.unitsW).toBe(7)
    expect(se!.unitsH).toBe(5)
    expect(se!.x).toBe(100)
    expect(se!.y).toBe(100)

    const nw = resizePlotFromCorner("nw", 100, 100, 5, 5, -30, -20)
    expect(nw).not.toBeNull()
    expect(nw!.x).toBeLessThan(100)
    expect(nw!.y).toBeLessThan(100)
    expect(isValidPlot(nw!.unitsW, nw!.unitsH)).toBe(true)
  })

  it("resizes plots from edge handles", () => {
    // Stay within 16:9 — growing 5×5 by 20px east → 7×5.
    const east = resizePlotFromHandle("e", 100, 100, 5, 5, 20, 99)
    expect(east).not.toBeNull()
    expect(east!.unitsW).toBe(7)
    expect(east!.unitsH).toBe(5)
    expect(east!.y).toBe(100)

    const south = resizePlotFromHandle("s", 100, 100, 5, 5, 99, 20)
    expect(south).not.toBeNull()
    expect(south!.unitsW).toBe(5)
    expect(south!.unitsH).toBe(7)
    expect(south!.x).toBe(100)
  })

  it("keeps a custom area as the sticker-mode minimum", () => {
    const floor = { w: 20, h: 12 }
    // Small art inside a big custom area keeps the area.
    expect(plotUnitsWithFloor(80, 80, 0, floor)).toEqual({
      unitsW: 20,
      unitsH: 12,
    })
    // Art bigger than the area grows it on the side that needs it.
    expect(plotUnitsWithFloor(150, 150, 0, floor)).toEqual({
      unitsW: 20,
      unitsH: 15,
    })
    // Tiny art shrinks the area so the sticker stays ≥ 20% of the plot.
    const tiny = plotUnitsWithFloor(30, 30, 0, { w: 100, h: 100 })
    expect(tiny.unitsW).toBeLessThanOrEqual(15)
    expect(isValidPlot(tiny.unitsW, tiny.unitsH)).toBe(true)
  })

  it("moves a plot only as far as needed to contain the sticker", () => {
    const center = { x: 500, y: 500 }
    // Already contains the art: stays put.
    expect(plotOriginContaining(400, 420, 20, 12, center, 40, 40)).toEqual({
      x: 400,
      y: 420,
    })
    // Art sticks out past the right edge: shift just enough.
    expect(plotOriginContaining(200, 420, 20, 12, center, 40, 40).x).toBe(340)
  })

  it("clamps area resizes at limits and reports which rule hit", () => {
    const min = resizePlotFromHandle("e", 100, 100, 5, 5, -200, 0)
    expect(min).toMatchObject({ unitsW: 3, x: 100, limit: "min" })

    // Opposite edge stays put when dragging the west side past the max.
    const max = resizePlotFromHandle("w", 2000, 100, 90, 90, -500, 0)
    expect(max).toMatchObject({ unitsW: 100, limit: "max" })
    expect(max!.x + max!.unitsW * 10).toBe(2000 + 900)

    const wide = resizePlotFromHandle("e", 100, 100, 9, 9, 200, 0)
    expect(wide).toMatchObject({ unitsW: 16, unitsH: 9, limit: "wide" })

    const tall = resizePlotFromHandle("s", 100, 100, 9, 9, 0, 200)
    expect(tall).toMatchObject({ unitsW: 9, unitsH: 16, limit: "tall" })

    expect(resizePlotFromHandle("e", 100, 100, 5, 5, 20, 0)!.limit).toBeNull()
  })
})

describe("isOfferExpired", () => {
  it("keeps a promo live through its end date", () => {
    expect(isOfferExpired("2026-10-05", "2026-10-05")).toBe(false)
    expect(isOfferExpired("2026-10-04", "2026-10-05")).toBe(true)
    expect(isOfferExpired(undefined, "2026-10-05")).toBe(false)
  })
})

describe("normalizeCategory", () => {
  it("keeps current categories and maps legacy names", () => {
    expect(normalizeCategory("Developer Tools")).toBe("Developer Tools")
    expect(normalizeCategory("SaaS")).toBe("Productivity")
    expect(normalizeCategory("Newsletter")).toBe("Media & Newsletters")
    expect(normalizeCategory("Mobile")).toBe("Other")
  })

  it("falls back to Other for unknown or empty values", () => {
    expect(normalizeCategory("Blockchain Stuff")).toBe("Other")
    expect(normalizeCategory(undefined)).toBe("Other")
  })
})

describe("plotCoverage", () => {
  const target = { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }

  it("is fully visible with nothing above", () => {
    const below = { x: 0, y: 0, width: 100, height: 100, zIndex: 0 }
    expect(plotCoverage(target, [target, below])).toEqual({
      visible: 1,
      coveredBy: 0,
    })
  })

  it("subtracts overlapping plots above without double counting", () => {
    const a = { x: 50, y: 0, width: 50, height: 100, zIndex: 2 }
    const b = { x: 50, y: 50, width: 50, height: 50, zIndex: 3 }
    const apart = { x: 200, y: 200, width: 10, height: 10, zIndex: 4 }
    expect(plotCoverage(target, [target, a, b, apart])).toEqual({
      visible: 0.5,
      coveredBy: 2,
    })
  })

  it("reaches zero when fully covered", () => {
    const top = { x: -10, y: -10, width: 200, height: 200, zIndex: 5 }
    expect(plotCoverage(target, [target, top]).visible).toBe(0)
  })

  it("maps visible share to a status", () => {
    expect(plotVisibility(1)).toBe("visible")
    expect(plotVisibility(0.5)).toBe("partly")
    expect(plotVisibility(0.2)).toBe("mostly")
    expect(plotVisibility(0)).toBe("hidden")
  })
})

describe("uncoveredPlacements", () => {
  it("drops plots fully covered by several newer plots together", () => {
    const old = { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
    const left = { x: 0, y: 0, width: 50, height: 100, zIndex: 2 }
    const right = { x: 50, y: 0, width: 50, height: 100, zIndex: 3 }
    expect(uncoveredPlacements([old, left, right])).toEqual([left, right])
  })

  it("keeps a plot while any sliver still shows", () => {
    const old = { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
    const top = { x: 0, y: 0, width: 100, height: 99, zIndex: 2 }
    expect(uncoveredPlacements([old, top])).toEqual([old, top])
  })

  it("ignores older plots stacked underneath", () => {
    const top = { x: 0, y: 0, width: 50, height: 50, zIndex: 2 }
    const under = { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
    expect(uncoveredPlacements([top, under])).toEqual([top, under])
  })
})

describe("restorePrice", () => {
  it("charges only for the covered units", () => {
    expect(restorePrice(10, 10, 0.8)).toBe(20)
    expect(restorePrice(10, 10, 0)).toBe(100)
  })

  it("never goes below the smallest plot", () => {
    expect(RESTORE_MIN_PRICE).toBe(9)
    expect(restorePrice(10, 10, 0.97)).toBe(9)
  })

  it("is free when nothing is covered", () => {
    expect(restorePrice(10, 10, 1)).toBe(0)
    expect(restorePrice(10, 10, 0.9995)).toBe(0)
  })

  it("rounds partial units up without float drift", () => {
    expect(coveredUnits(10, 10, 0.8)).toBe(20)
    expect(coveredUnits(10, 10, 0.795)).toBe(21)
  })
})

describe("visibleAreaShare", () => {
  it("weights each plot by its size", () => {
    const big = { unitsW: 10, unitsH: 10, visibleShare: 0 }
    const small = { unitsW: 3, unitsH: 3, visibleShare: 1 }
    expect(visibleAreaShare([big, small])).toBeCloseTo(9 / 109)
  })

  it("is null before anything is placed", () => {
    expect(visibleAreaShare([])).toBeNull()
  })
})
