import { describe, expect, it } from "vitest"
import {
  PLOT_MAX,
  PLOT_MIN,
  SIZE_TIERS,
  UNIT_SCALE,
  WALL_SIZE,
  fieldWarning,
  formatPlot,
  isValidPlot,
  plotPrice,
  plotSideBounds,
  sizePx,
  unitsToPx,
  validatePlot,
} from "./types"

describe("sticker wall sizing", () => {
  it("keeps a 1000×1000 world", () => {
    expect(WALL_SIZE).toBe(1000)
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
})
