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
  isValidPlot,
  maxScaleThatFits,
  plotPrice,
  plotSideBounds,
  plotUnitsForSticker,
  resizePlotFromCorner,
  resizePlotFromHandle,
  sizeParamFromContentUnits,
  sizePx,
  snapPlotOrigin,
  stickerAabbInPlot,
  stickerBoxSize,
  stickerContentUnits,
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
})
