import { describe, expect, it } from "vitest"
import { rankStickers } from "./ranking"

function sticker(
  id: string,
  category: string,
  day: number,
  totalSpent: number
) {
  return {
    id,
    category,
    createdAt: `2026-10-0${day}T00:00:00Z`,
    totalSpent,
  }
}

describe("rankStickers", () => {
  it("ranks by total spend overall and within each category", () => {
    const ranks = rankStickers([
      sticker("a", "AI & Agents", 1, 125),
      sticker("b", "AI & Agents", 2, 144),
      sticker("c", "Productivity", 3, 9),
      sticker("d", "Productivity", 4, 0),
    ])

    expect(ranks.get("b")).toMatchObject({
      overall: 1,
      overallOf: 3,
      category: 1,
      categoryOf: 2,
      spent: 144,
    })
    expect(ranks.get("a")).toMatchObject({
      overall: 2,
      category: 2,
      spent: 125,
    })
    expect(ranks.get("c")).toMatchObject({
      overall: 3,
      category: 1,
      categoryOf: 1,
    })
    expect(ranks.has("d")).toBe(false)
  })

  it("breaks spend ties by listing date", () => {
    const ranks = rankStickers([
      sticker("b", "AI & Agents", 2, 25),
      sticker("a", "AI & Agents", 1, 25),
    ])
    expect(ranks.get("a")?.overall).toBe(1)
    expect(ranks.get("b")?.overall).toBe(2)
  })
})
