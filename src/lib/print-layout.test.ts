import { describe, expect, it } from "vitest"
import {
  addCopy,
  centeredCopy,
  draftFromMake,
  duplicateCopy,
  emptyDraft,
  maxStickerMm,
  moveCopy,
  parseSheetInput,
  readMakeSession,
  resizeCopy,
  type PlacedCopy,
} from "@/lib/print-layout"

function square(partial: Partial<PlacedCopy> = {}): PlacedCopy {
  return {
    id: "copy-1",
    stickerId: "st_meow",
    name: "Meow",
    imageUrl: "/api/stickers/st_meow/image",
    xMm: 10,
    yMm: 10,
    wMm: 50,
    hMm: 50,
    ...partial,
  }
}

describe("place stickers on paper", () => {
  it("centers one sticker from Make", () => {
    const draft = draftFromMake({
      imageUrl: "data:image/png;base64,aaa",
      width: 100,
      height: 100,
      sizeMm: 50,
    })
    expect(draft.copies).toHaveLength(1)
    expect(draft.copies[0]).toMatchObject({
      xMm: 80,
      yMm: 123.5,
      wMm: 50,
      hMm: 50,
    })
  })

  it("snaps a move to the grid and keeps the sticker on the page", () => {
    const snapped = moveCopy(square(), 210, 297, 12, 12, true)
    expect(snapped).toMatchObject({ xMm: 10, yMm: 10 })

    const edge = moveCopy(square({ xMm: 0, yMm: 0 }), 210, 297, 500, -20, false)
    expect(edge.xMm).toBe(160)
    expect(edge.yMm).toBe(0)
  })

  it("resizes without changing the sticker's shape", () => {
    const wide = square({ wMm: 40, hMm: 20 })
    expect(resizeCopy(wide, 210, 297, 80, true)).toMatchObject({
      wMm: 80,
      hMm: 40,
    })
    const huge = resizeCopy(square(), 148, 210, 400, false)
    expect(huge.wMm).toBeLessThanOrEqual(148)
    expect(huge.hMm).toBeLessThanOrEqual(210)
    expect(huge.wMm).toBeCloseTo(huge.hMm)
  })

  it("duplicates onto a free spot and stays on the page", () => {
    let draft = emptyDraft()
    draft = {
      ...draft,
      copies: [square({ id: "a", xMm: 180, yMm: 250, wMm: 20, hMm: 20 })],
    }
    const next = duplicateCopy(draft, "a", true)
    expect(next.error).toBeUndefined()
    expect(next.draft.copies).toHaveLength(2)
    const copy = next.draft.copies[1]
    expect(copy.xMm + copy.wMm).toBeLessThanOrEqual(210.1)
    expect(copy.yMm + copy.hMm).toBeLessThanOrEqual(297.1)
    expect(copy.xMm === 180 && copy.yMm === 250).toBe(false)
  })

  it("places a second sticker beside the first", () => {
    const first = centeredCopy(
      {
        stickerId: "st_meow",
        name: "Meow",
        imageUrl: "/api/stickers/st_meow/image",
      },
      1,
      50,
      210,
      297
    )
    const added = addCopy(
      { ...emptyDraft(), copies: [first] },
      {
        stickerId: "st_oki",
        name: "Oki",
        imageUrl: "/api/stickers/st_oki/image",
      },
      1,
      50,
      true
    )
    expect(added.draft.copies).toHaveLength(2)
    expect(added.draft.copies[1].stickerId).toBe("st_oki")
    expect(added.draft.copies[1].xMm).not.toBe(first.xMm)
  })
})

describe("print sheet input", () => {
  it("accepts two copies of one sticker and rejects one hanging off the page", () => {
    expect(
      parseSheetInput({
        name: "Saturday",
        paper: "a4",
        widthMm: 297,
        heightMm: 210,
        stickerMm: 50,
        copies: [
          { stickerId: "st_meow", xMm: 10, yMm: 10, wMm: 40, hMm: 40 },
          { stickerId: "st_meow", xMm: 60, yMm: 10, wMm: 40, hMm: 40 },
        ],
      })
    ).toMatchObject({ paper: "a4", widthMm: 297, copies: [{}, {}] })

    expect(
      parseSheetInput({
        name: "Saturday",
        paper: "a4",
        widthMm: 210,
        heightMm: 297,
        stickerMm: 50,
        copies: [{ stickerId: "st_meow", xMm: 200, yMm: 10, wMm: 50, hMm: 50 }],
      })
    ).toEqual({ error: "Keep each sticker on the paper." })
    expect(maxStickerMm(100, 100)).toBe(100)
  })

  it("rejects an unsaved Make sticker and a normal image url", () => {
    expect(
      parseSheetInput({
        name: "Saturday",
        paper: "a4",
        widthMm: 210,
        heightMm: 297,
        stickerMm: 50,
        copies: [{ stickerId: "make", xMm: 10, yMm: 10, wMm: 50, hMm: 50 }],
      })
    ).toEqual({ error: "A sticker on this sheet can't be printed." })

    expect(
      readMakeSession(
        JSON.stringify({
          imageUrl: "https://example.com/a.png",
          width: 10,
          height: 10,
          sizeMm: 50,
        })
      )
    ).toBeNull()
    expect(
      readMakeSession(
        JSON.stringify({
          imageUrl: "data:image/png;base64,aaa",
          width: 10,
          height: 20,
          sizeMm: 40,
        })
      )
    ).toMatchObject({ width: 10, height: 20, sizeMm: 40 })
  })
})
