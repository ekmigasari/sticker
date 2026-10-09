/** Crop box in 0–1 units of the rotated (but uncropped) photo frame. */
export type CropRect = { x: number; y: number; w: number; h: number }

export const CROP_ASPECTS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
] as const

export type CropAspect = (typeof CROP_ASPECTS)[number]["id"]

/**
 * Non-destructive photo edits, applied in order: flip, quarter turns,
 * straighten, crop. Straightening zooms in so no empty corners appear.
 */
export type ImageEdit = {
  /** Clockwise quarter turns, 0–3. */
  quarter: number
  /** Fine rotation in degrees, -45 to 45. */
  straighten: number
  flipX: boolean
  crop: CropRect
  aspect: CropAspect
}

export type Size = { width: number; height: number }

export const STRAIGHTEN_MAX = 45
const MIN_CROP = 0.08

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 }

export const DEFAULT_EDIT: ImageEdit = {
  quarter: 0,
  straighten: 0,
  flipX: false,
  crop: FULL_CROP,
  aspect: "free",
}

export function isDefaultEdit(edit: ImageEdit) {
  const { crop } = edit
  return (
    edit.quarter === 0 &&
    edit.straighten === 0 &&
    !edit.flipX &&
    crop.x === 0 &&
    crop.y === 0 &&
    crop.w === 1 &&
    crop.h === 1
  )
}

/** Photo size after quarter turns. */
export function orientedSize(size: Size, quarter: number): Size {
  return quarter % 2 === 1 ? { width: size.height, height: size.width } : size
}

/** Zoom that keeps a straightened photo covering its original frame. */
export function straightenScale(frame: Size, degrees: number) {
  const a = (Math.abs(degrees) * Math.PI) / 180
  const long = Math.max(frame.width / frame.height, frame.height / frame.width)
  return Math.cos(a) + long * Math.sin(a)
}

function aspectRatioOf(aspect: CropAspect) {
  return CROP_ASPECTS.find((a) => a.id === aspect)?.ratio ?? null
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Shifts `crop` back inside the frame without resizing it. */
function clampCrop(crop: CropRect): CropRect {
  const w = clamp(crop.w, MIN_CROP, 1)
  const h = clamp(crop.h, MIN_CROP, 1)
  return { x: clamp(crop.x, 0, 1 - w), y: clamp(crop.y, 0, 1 - h), w, h }
}

/** Largest box with normalised ratio `rn` (w ÷ h) centred inside `box`. */
function largestInside(rn: number, box: CropRect): CropRect {
  const wide = box.w / box.h > rn
  const w = wide ? box.h * rn : box.w
  const h = wide ? box.h : box.w / rn
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/** Pixel aspect ratio expressed in 0–1 frame units. */
function normalisedRatio(ratio: number, frame: Size) {
  return ratio / (frame.width / frame.height)
}

export function setCropAspect(
  edit: ImageEdit,
  aspect: CropAspect,
  size: Size
): ImageEdit {
  const ratio = aspectRatioOf(aspect)
  if (ratio == null) return { ...edit, aspect }
  const frame = orientedSize(size, edit.quarter)
  const fit = largestInside(normalisedRatio(ratio, frame), FULL_CROP)
  const cx = edit.crop.x + edit.crop.w / 2
  const cy = edit.crop.y + edit.crop.h / 2
  return {
    ...edit,
    aspect,
    crop: clampCrop({ ...fit, x: cx - fit.w / 2, y: cy - fit.h / 2 }),
  }
}

/** Turns the photo 90° counter-clockwise, carrying the crop with it. */
export function rotateLeft(edit: ImageEdit, size: Size): ImageEdit {
  const { x, y, w, h } = edit.crop
  const quarter = (edit.quarter + 3) % 4
  let crop: CropRect = { x: y, y: 1 - x - w, w: h, h: w }
  const ratio = aspectRatioOf(edit.aspect)
  if (ratio != null) {
    const frame = orientedSize(size, quarter)
    crop = largestInside(normalisedRatio(ratio, frame), crop)
  }
  return { ...edit, quarter, crop: clampCrop(crop) }
}

/** Mirrors the photo as seen on screen, whatever its rotation. */
export function flipHorizontal(edit: ImageEdit): ImageEdit {
  const { crop } = edit
  return {
    ...edit,
    quarter: (4 - edit.quarter) % 4,
    straighten: edit.straighten === 0 ? 0 : -edit.straighten,
    flipX: !edit.flipX,
    crop: { ...crop, x: 1 - crop.x - crop.w },
  }
}

export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se"

/**
 * Applies a pointer drag of (`dx`, `dy`) frame units to `start`.
 * Locked aspects resize from corners only, keeping the opposite corner put.
 */
export function dragCrop(
  start: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  aspect: CropAspect,
  frame: Size
): CropRect {
  if (handle === "move") {
    return {
      ...start,
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
    }
  }

  const left = start.x
  const top = start.y
  const right = start.x + start.w
  const bottom = start.y + start.h
  const ratio = aspectRatioOf(aspect)

  if (ratio == null) {
    let l = left
    let t = top
    let r = right
    let b = bottom
    if (handle.includes("w")) l = clamp(left + dx, 0, right - MIN_CROP)
    if (handle.includes("e")) r = clamp(right + dx, left + MIN_CROP, 1)
    if (handle.includes("n")) t = clamp(top + dy, 0, bottom - MIN_CROP)
    if (handle.includes("s")) b = clamp(bottom + dy, top + MIN_CROP, 1)
    return { x: l, y: t, w: r - l, h: b - t }
  }

  if (handle.length !== 2) return start
  const rn = normalisedRatio(ratio, frame)
  const east = handle.includes("e")
  const south = handle.includes("s")
  const ax = east ? left : right
  const ay = south ? top : bottom
  const px = (east ? right : left) + dx
  const py = (south ? bottom : top) + dy
  let w = Math.max(Math.abs(px - ax), Math.abs(py - ay) * rn)
  let h = w / rn
  const maxW = east ? 1 - ax : ax
  const maxH = south ? 1 - ay : ay
  if (w > maxW) {
    w = maxW
    h = w / rn
  }
  if (h > maxH) {
    h = maxH
    w = h * rn
  }
  const min = Math.max(MIN_CROP, MIN_CROP * rn)
  if (w < min) {
    w = min
    h = w / rn
  }
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h }
}

/** Nudges the crop box with the keyboard. */
export function nudgeCrop(crop: CropRect, dx: number, dy: number): CropRect {
  return dragCrop(crop, "move", dx, dy, "free", { width: 1, height: 1 })
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */

/** Longest side of the edited photo; larger results are scaled down. */
const EDIT_MAX_SIDE = 4096

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}

/** Renders `edit` onto `source` and returns an object URL for the result. */
export async function renderEdited(
  source: string,
  edit: ImageEdit
): Promise<string> {
  const img = await loadImage(source)
  const size = { width: img.naturalWidth, height: img.naturalHeight }
  const frame = orientedSize(size, edit.quarter)
  const crop = {
    x: edit.crop.x * frame.width,
    y: edit.crop.y * frame.height,
    w: edit.crop.w * frame.width,
    h: edit.crop.h * frame.height,
  }
  const scale = Math.min(1, EDIT_MAX_SIDE / Math.max(crop.w, crop.h))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(crop.w * scale))
  canvas.height = Math.max(1, Math.round(crop.h * scale))
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.scale(scale, scale)
  ctx.translate(-crop.x + frame.width / 2, -crop.y + frame.height / 2)
  ctx.rotate((edit.straighten * Math.PI) / 180)
  const zoom = straightenScale(frame, edit.straighten)
  ctx.scale(zoom, zoom)
  ctx.rotate((edit.quarter * Math.PI) / 2)
  if (edit.flipX) ctx.scale(-1, 1)
  ctx.drawImage(img, -size.width / 2, -size.height / 2)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  )
  if (!blob) throw new Error("Could not encode image")
  return URL.createObjectURL(blob)
}
