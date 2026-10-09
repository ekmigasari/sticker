import { describe, expect, it } from "vitest"
import {
  DEFAULT_EDIT,
  dragCrop,
  flipHorizontal,
  isDefaultEdit,
  rotateLeft,
  setCropAspect,
  straightenScale,
} from "./image-edit"

const landscape = { width: 400, height: 200 }

describe("image edits", () => {
  it("starts as a no-op", () => {
    expect(isDefaultEdit(DEFAULT_EDIT)).toBe(true)
    expect(isDefaultEdit({ ...DEFAULT_EDIT, flipX: true })).toBe(false)
  })

  it("comes back to the start after four left turns", () => {
    let edit = { ...DEFAULT_EDIT, crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }
    for (let i = 0; i < 4; i++) edit = rotateLeft(edit, landscape)
    expect(edit.quarter).toBe(0)
    expect(edit.crop.x).toBeCloseTo(0.1)
    expect(edit.crop.y).toBeCloseTo(0.2)
    expect(edit.crop.w).toBeCloseTo(0.3)
    expect(edit.crop.h).toBeCloseTo(0.4)
  })

  it("mirrors the crop and rotation when flipped", () => {
    const start = {
      ...DEFAULT_EDIT,
      quarter: 1,
      straighten: 10,
      crop: { x: 0.1, y: 0, w: 0.3, h: 1 },
    }
    const edit = flipHorizontal(start)
    expect(edit.quarter).toBe(3)
    expect(edit.straighten).toBe(-10)
    expect(edit.flipX).toBe(true)
    expect(edit.crop.x).toBeCloseTo(0.6)
    const back = flipHorizontal(edit)
    expect(back.quarter).toBe(1)
    expect(back.flipX).toBe(false)
    expect(back.crop.x).toBeCloseTo(0.1)
  })

  it("fits a square crop to a landscape photo", () => {
    const edit = setCropAspect(DEFAULT_EDIT, "1:1", landscape)
    // 1:1 in pixels is half the frame wide on a 2:1 photo.
    expect(edit.crop.w).toBeCloseTo(0.5)
    expect(edit.crop.h).toBeCloseTo(1)
    expect(edit.crop.x).toBeCloseTo(0.25)
  })

  it("keeps a locked ratio while dragging a corner", () => {
    const start = setCropAspect(DEFAULT_EDIT, "4:5", landscape).crop
    const next = dragCrop(start, "se", -0.1, -0.1, "4:5", landscape)
    const pixelRatio = (next.w * landscape.width) / (next.h * landscape.height)
    expect(pixelRatio).toBeCloseTo(0.8)
    expect(next.x).toBeCloseTo(start.x)
    expect(next.y).toBeCloseTo(start.y)
  })

  it("never drags the crop outside the photo", () => {
    const crop = { x: 0.5, y: 0.5, w: 0.4, h: 0.4 }
    const moved = dragCrop(crop, "move", 1, 1, "free", landscape)
    expect(moved.x + moved.w).toBeCloseTo(1)
    expect(moved.y + moved.h).toBeCloseTo(1)
    const grown = dragCrop(crop, "nw", -2, -2, "free", landscape)
    expect(grown.x).toBe(0)
    expect(grown.y).toBe(0)
  })

  it("zooms in just enough to hide straightened corners", () => {
    expect(straightenScale(landscape, 0)).toBe(1)
    expect(straightenScale(landscape, 10)).toBeGreaterThan(1)
    expect(straightenScale(landscape, -10)).toBe(straightenScale(landscape, 10))
  })
})
