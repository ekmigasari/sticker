import { describe, expect, it } from "vitest"
import { SIZE_TIERS, UNIT_SCALE, WALL_SIZE, sizePx } from "./types"

describe("sticker wall sizing", () => {
  it("keeps a 1000×1000 world", () => {
    expect(WALL_SIZE).toBe(1000)
  })

  it("prices S/M/L at $1 per square unit", () => {
    expect(SIZE_TIERS.S.price).toBe(SIZE_TIERS.S.units ** 2)
    expect(SIZE_TIERS.M.price).toBe(SIZE_TIERS.M.units ** 2)
    expect(SIZE_TIERS.L.price).toBe(SIZE_TIERS.L.units ** 2)
  })

  it("scales wall pixels from pricing units", () => {
    expect(sizePx("S")).toBe(3 * UNIT_SCALE)
    expect(sizePx("M")).toBe(5 * UNIT_SCALE)
    expect(sizePx("L")).toBe(10 * UNIT_SCALE)
  })
})
