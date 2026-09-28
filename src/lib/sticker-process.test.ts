import { describe, expect, it } from "vitest"
import { pxToMm, STICKER_FILTERS, STICKER_STYLES } from "@/domain/types"
import { SIZE_DEFAULT, SIZE_MAX, SIZE_MIN } from "@/lib/sticker-process"

describe("sticker editor domain", () => {
  it("converts pixels to millimetres at 300 DPI", () => {
    expect(pxToMm(300)).toBeCloseTo(25.4, 5)
    expect(pxToMm(640)).toBeCloseTo((640 * 25.4) / 300, 5)
  })

  it("exposes a usable size range", () => {
    expect(SIZE_MIN).toBeLessThan(SIZE_DEFAULT)
    expect(SIZE_DEFAULT).toBeLessThan(SIZE_MAX)
  })

  it("includes None style and new filters", () => {
    expect(STICKER_STYLES).toContain("none")
    expect(STICKER_FILTERS).toEqual(
      expect.arrayContaining([
        "glitter",
        "glow",
        "red",
        "blue",
        "green",
        "yellow",
      ])
    )
  })
})
