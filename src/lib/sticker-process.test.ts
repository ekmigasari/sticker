import { describe, expect, it } from "vitest"
import {
  isFilter,
  isFinish,
  isHoloFinish,
  pxToMm,
  STICKER_FILTERS,
  STICKER_FINISHES,
  STICKER_STYLES,
} from "@/domain/types"
import {
  SIZE_DEFAULT_MM,
  SIZE_MAX_MM,
  SIZE_MIN_MM,
} from "@/lib/sticker-process"

describe("sticker editor domain", () => {
  it("converts pixels to millimetres at 300 DPI", () => {
    expect(pxToMm(300)).toBeCloseTo(25.4, 5)
    expect(pxToMm(640)).toBeCloseTo((640 * 25.4) / 300, 5)
  })

  it("exposes a usable size range up to 500mm", () => {
    expect(SIZE_MIN_MM).toBeLessThan(SIZE_DEFAULT_MM)
    expect(SIZE_DEFAULT_MM).toBeLessThan(SIZE_MAX_MM)
    expect(SIZE_MAX_MM).toBe(500)
  })

  it("includes shape styles and colour-gradation filters", () => {
    expect(STICKER_STYLES).toEqual([
      "none",
      "classic",
      "stamp",
      "rough",
      "square",
      "rounded",
      "circle",
    ])
    expect(STICKER_FILTERS).toEqual(
      expect.arrayContaining([
        "aurora",
        "sunset",
        "ocean",
        "red",
        "blue",
        "green",
        "yellow",
      ])
    )
  })

  it("keeps finishes separate from colour filters", () => {
    expect(STICKER_FINISHES).toEqual([
      "none",
      "matte",
      "gloss",
      "glitter",
      "hologram",
    ])
    for (const finish of STICKER_FINISHES) expect(isFilter(finish)).toBe(false)
    for (const filter of STICKER_FILTERS) expect(isFinish(filter)).toBe(false)
    expect(isHoloFinish("hologram")).toBe(true)
    expect(isHoloFinish("glitter")).toBe(true)
    expect(isHoloFinish("gloss")).toBe(false)
  })
})
