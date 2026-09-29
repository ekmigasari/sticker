import type { StickerFilter, StickerStyle } from "@/domain/types"

export type RenderOptions = {
  style: StickerStyle
  filter: StickerFilter
  outlineColor: string
  /** Outline / paper margin, expressed at the 640px baseline. */
  outlineThickness: number
  /** Longest side of the subject in output pixels. */
  maxSide?: number
}

const BASELINE = 640
/** Live preview render resolution — keeps the editor snappy while sizing. */
export const PREVIEW_MAX_SIDE = 720
/** Print size range in millimetres (300 DPI). */
export const SIZE_MIN_MM = 10
export const SIZE_MAX_MM = 500
export const SIZE_DEFAULT_MM = 54
/** Pixel equivalents kept for export / tests (300 DPI). */
export const SIZE_MIN = Math.round((SIZE_MIN_MM * 300) / 25.4)
export const SIZE_MAX = Math.round((SIZE_MAX_MM * 300) / 25.4)
export const SIZE_DEFAULT = Math.round((SIZE_DEFAULT_MM * 300) / 25.4)

type Canvas = HTMLCanvasElement

function makeCanvas(w: number, h: number): Canvas {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

function ctx2d(c: Canvas): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Canvas unsupported")
  return ctx
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: [number, number, number]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}

/* ------------------------------------------------------------------ */
/* Subject preparation: scale + trim transparent subjects             */
/* ------------------------------------------------------------------ */

function hasTransparentBorder(data: Uint8ClampedArray, w: number, h: number) {
  let clear = 0
  let total = 0
  const check = (x: number, y: number) => {
    total++
    if (data[(y * w + x) * 4 + 3] < 128) clear++
  }
  for (let x = 0; x < w; x += 2) {
    check(x, 0)
    check(x, h - 1)
  }
  for (let y = 0; y < h; y += 2) {
    check(0, y)
    check(w - 1, y)
  }
  return clear / total > 0.05
}

function trim(src: Canvas): Canvas {
  const ctx = ctx2d(src)
  const { data, width: w, height: h } = ctx.getImageData(
    0,
    0,
    src.width,
    src.height
  )
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return src
  const out = makeCanvas(maxX - minX + 1, maxY - minY + 1)
  ctx2d(out).drawImage(src, -minX, -minY)
  return out
}

const subjectCache = new Map<string, Promise<Canvas>>()

function prepareSubject(source: string, maxSide: number): Promise<Canvas> {
  const key = `${maxSide}|${source}`
  const hit = subjectCache.get(key)
  if (hit) return hit

  const job = loadImage(source).then((img) => {
    // Allow upscaling when the user asks for a larger sticker size.
    const scale = maxSide / Math.max(img.width, img.height)
    const c = makeCanvas(img.width * scale, img.height * scale)
    const ctx = ctx2d(c)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const data = ctx.getImageData(0, 0, c.width, c.height)

    // PNGs (and any image with a clear border) keep an object-shaped cutout
    // so outlines follow the subject instead of a square frame.
    if (hasTransparentBorder(data.data, c.width, c.height)) {
      return trim(c)
    }
    return c
  })

  subjectCache.set(key, job)
  if (subjectCache.size > 12) {
    const first = subjectCache.keys().next().value
    if (first) subjectCache.delete(first)
  }
  return job
}

/** Longest side of the source image in pixels (natural size). */
export async function getSourceMaxSide(source: string): Promise<number> {
  const img = await loadImage(source)
  return Math.max(img.width, img.height)
}

/* ------------------------------------------------------------------ */
/* Masks                                                              */
/* ------------------------------------------------------------------ */

/** Solid alpha mask of `src` grown by `r` px, placed with `pad` margin. */
function dilate(src: Canvas, r: number, pad: number): Canvas {
  const out = makeCanvas(src.width + pad * 2, src.height + pad * 2)
  const ctx = ctx2d(out)
  ctx.drawImage(src, pad, pad)
  const rings = r > 0 ? [1, 0.72, 0.44, 0.2] : []
  for (const f of rings) {
    const rr = r * f
    const steps = Math.max(12, Math.ceil((Math.PI * 2 * rr) / 2))
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      ctx.drawImage(src, pad + Math.cos(a) * rr, pad + Math.sin(a) * rr)
    }
  }
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const { data, width: w, height: h } = img
  const alpha = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3] >= 100 ? 255 : 0
  const smooth = boxBlurAlpha(alpha, w, h)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 0
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = 0
    data[i * 4 + 3] = smooth[i]
  }
  ctx.putImageData(img, 0, 0)
  return out
}

function boxBlurAlpha(a: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          s += a[yy * w + xx]
          n++
        }
      }
      out[y * w + x] = s / n
    }
  }
  return out
}

function tint(mask: Canvas, color: string): Canvas {
  const out = makeCanvas(mask.width, mask.height)
  const ctx = ctx2d(out)
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, out.width, out.height)
  return out
}

/** Adds paper grain to opaque pixels so fills don't read as flat vector. */
function grain(c: Canvas, amount: number, seed: number) {
  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data } = img
  const rand = mulberry32(seed)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const n = (rand() - 0.5) * amount
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

type Composed = {
  base: Canvas
  subjectX: number
  subjectY: number
  /** When true, subject is already painted+clipped into `base`. */
  baked?: boolean
}

/** No outline — subject alone, with a 1px hairline for light artwork. */
function composeNone(subject: Canvas): Composed {
  const pad = 2
  const base = makeCanvas(subject.width + pad * 2, subject.height + pad * 2)
  // Transparent base; hairline is drawn later from the subject mask.
  return { base, subjectX: pad, subjectY: pad }
}

function composeClassic(subject: Canvas, t: number, color: string): Composed {
  const r = Math.max(2, t)
  const pad = Math.ceil(r + 4)
  const base = tint(dilate(subject, r, pad), color)
  return { base, subjectX: pad, subjectY: pad }
}

/** Solid square backing; subject is fully inset and clipped inside. */
function composeSquare(subject: Canvas, t: number, color: string): Composed {
  const margin = Math.max(10, t * 1.25)
  const pad = 2
  const inner = Math.max(subject.width, subject.height) + margin * 2
  const base = makeCanvas(inner + pad * 2, inner + pad * 2)
  const ctx = ctx2d(base)
  const x0 = pad
  const y0 = pad
  ctx.fillStyle = color
  ctx.fillRect(x0, y0, inner, inner)
  grain(base, 8, 11)
  const sx = pad + (inner - subject.width) / 2
  const sy = pad + (inner - subject.height) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, inner, inner)
  ctx.clip()
  ctx.drawImage(subject, sx, sy)
  ctx.restore()
  return { base, subjectX: sx, subjectY: sy, baked: true }
}

/** Soft rounded-rect backing; subject fully inset inside the rounded frame. */
function composeRounded(subject: Canvas, t: number, color: string): Composed {
  const margin = Math.max(12, t * 1.35)
  const pad = 2
  const w = subject.width + margin * 2
  const h = subject.height + margin * 2
  // Keep radius modest so corners don't eat into the artwork.
  const radius = Math.min(w, h) * 0.12
  const base = makeCanvas(w + pad * 2, h + pad * 2)
  const ctx = ctx2d(base)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(pad, pad, w, h, radius)
  ctx.fill()
  grain(base, 8, 13)
  const sx = pad + margin
  const sy = pad + margin
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(pad, pad, w, h, radius)
  ctx.clip()
  ctx.drawImage(subject, sx, sy)
  ctx.restore()
  return { base, subjectX: sx, subjectY: sy, baked: true }
}

/**
 * Circular backing sized to the subject diagonal so the full image sits
 * inside the circle (not clipped by the round edge).
 */
function composeCircle(subject: Canvas, t: number, color: string): Composed {
  const margin = Math.max(14, t * 1.5)
  const pad = 2
  // Diameter must cover the subject diagonal + padding on both sides.
  const inner = Math.ceil(Math.hypot(subject.width, subject.height) + margin * 2)
  const base = makeCanvas(inner + pad * 2, inner + pad * 2)
  const ctx = ctx2d(base)
  const cx = pad + inner / 2
  const cy = pad + inner / 2
  const radius = inner / 2
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  grain(base, 8, 17)
  const sx = pad + (inner - subject.width) / 2
  const sy = pad + (inner - subject.height) / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(subject, sx, sy)
  ctx.restore()
  return { base, subjectX: sx, subjectY: sy, baked: true }
}

function composeStamp(subject: Canvas, t: number, color: string): Composed {
  const margin = Math.max(8, t * 1.25)
  const hole = Math.max(3, margin * 0.34)
  const pad = 2
  const w = subject.width + margin * 2
  const h = subject.height + margin * 2
  const base = makeCanvas(w + pad * 2, h + pad * 2)
  const ctx = ctx2d(base)

  ctx.fillStyle = color
  ctx.fillRect(pad, pad, w, h)
  grain(base, 10, 7)

  const rgb = hexToRgb(color)
  ctx.strokeStyle =
    luminance(rgb) > 0.55 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  ctx.lineWidth = Math.max(1, margin * 0.08)
  const inset = margin * 0.52
  ctx.strokeRect(pad + inset, pad + inset, w - inset * 2, h - inset * 2)

  // Perforated edge: holes centred on the paper edge, landing on corners.
  ctx.globalCompositeOperation = "destination-out"
  const perforate = (len: number, place: (d: number) => [number, number]) => {
    const count = Math.max(2, Math.round(len / (hole * 3)))
    for (let i = 0; i <= count; i++) {
      const [x, y] = place((i / count) * len)
      ctx.beginPath()
      ctx.arc(x, y, hole, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  perforate(w, (d) => [pad + d, pad])
  perforate(w, (d) => [pad + d, pad + h])
  perforate(h, (d) => [pad, pad + d])
  perforate(h, (d) => [pad + w, pad + d])
  ctx.globalCompositeOperation = "source-over"

  return { base, subjectX: pad + margin, subjectY: pad + margin }
}

function composeRough(subject: Canvas, t: number, color: string): Composed {
  const r = Math.max(5, t * 1.2)
  const amp = Math.max(2.5, r * 0.42)
  const pad = Math.ceil(r + amp + 4)
  const mask = dilate(subject, r, pad)
  const mctx = ctx2d(mask)
  const src = mctx.getImageData(0, 0, mask.width, mask.height)
  const w = mask.width
  const h = mask.height

  // Low-frequency displacement field gives the torn, hand-cut contour.
  const cell = Math.max(6, r * 0.9)
  const gw = Math.ceil(w / cell) + 2
  const gh = Math.ceil(h / cell) + 2
  const rand = mulberry32(1337)
  const gx = new Float32Array(gw * gh)
  const gy = new Float32Array(gw * gh)
  for (let i = 0; i < gw * gh; i++) {
    gx[i] = (rand() * 2 - 1) * amp
    gy[i] = (rand() * 2 - 1) * amp
  }
  const field = (arr: Float32Array, x: number, y: number) => {
    const fx = x / cell
    const fy = y / cell
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = fx - x0
    const ty = fy - y0
    const a = arr[y0 * gw + x0]
    const b = arr[y0 * gw + x0 + 1]
    const c = arr[(y0 + 1) * gw + x0]
    const d = arr[(y0 + 1) * gw + x0 + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
  }

  const alpha = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const jx = rand() - 0.5
      const jy = rand() - 0.5
      const sx = Math.round(x + field(gx, x, y) + jx)
      const sy = Math.round(y + field(gy, x, y) + jy)
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
      alpha[y * w + x] = src.data[(sy * w + sx) * 4 + 3] >= 128 ? 255 : 0
    }
  }
  const smooth = boxBlurAlpha(alpha, w, h)

  const [cr, cg, cb] = hexToRgb(color)
  const out = mctx.createImageData(w, h)
  const grainRand = mulberry32(99)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const a = smooth[i]
      if (a === 0) continue
      const edge =
        (x > 2 && alpha[i - 3] === 0) ||
        (x < w - 3 && alpha[i + 3] === 0) ||
        (y > 2 && alpha[i - 3 * w] === 0) ||
        (y < h - 3 && alpha[i + 3 * w] === 0)
      const shade = edge ? 0.9 : 1
      const n = (grainRand() - 0.5) * 14
      const o = i * 4
      out.data[o] = Math.max(0, Math.min(255, cr * shade + n))
      out.data[o + 1] = Math.max(0, Math.min(255, cg * shade + n))
      out.data[o + 2] = Math.max(0, Math.min(255, cb * shade + n))
      out.data[o + 3] = a
    }
  }
  const base = makeCanvas(w, h)
  ctx2d(base).putImageData(out, 0, 0)
  return { base, subjectX: pad, subjectY: pad }
}

/* ------------------------------------------------------------------ */
/* Filters                                                            */
/* ------------------------------------------------------------------ */

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function toneFilter(c: Canvas, filter: StickerFilter) {
  if (
    filter === "original" ||
    filter === "glitter" ||
    filter === "hologram" ||
    filter === "aurora" ||
    filter === "sunset" ||
    filter === "ocean" ||
    filter === "glow"
  ) {
    return
  }
  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data } = img
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
    switch (filter) {
      case "vivid": {
        const s = 1.5
        r = gray + (r - gray) * s
        g = gray + (g - gray) * s
        b = gray + (b - gray) * s
        r = (r - 128) * 1.08 + 128
        g = (g - 128) * 1.08 + 128
        b = (b - 128) * 1.08 + 128
        break
      }
      case "warm":
        r = r * 1.06 + 8
        g = g * 1.01 + 2
        b = b * 0.86
        break
      case "cool":
        r = r * 0.9
        g = g * 1.0 + 2
        b = b * 1.06 + 10
        break
      case "mono":
        r = g = b = (gray - 128) * 1.04 + 128
        break
      case "noir":
        r = g = b = (gray - 128) * 1.55 + 118
        break
      case "red":
        r = gray * 1.15 + 40
        g = gray * 0.25
        b = gray * 0.2
        break
      case "blue":
        r = gray * 0.2
        g = gray * 0.45
        b = gray * 1.2 + 35
        break
      case "green":
        r = gray * 0.25
        g = gray * 1.15 + 30
        b = gray * 0.35
        break
      case "yellow":
        r = gray * 1.1 + 45
        g = gray * 1.05 + 35
        b = gray * 0.25
        break
    }
    data[i] = clamp255(r)
    data[i + 1] = clamp255(g)
    data[i + 2] = clamp255(b)
  }
  ctx.putImageData(img, 0, 0)
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/**
 * Holographic glitter foil. The surface is split into flakes; each flake
 * catches light differently (hue + brightness), a few flash as sparkles.
 * Light artwork takes strong iridescence, dark artwork keeps its depth.
 */
function glitter(c: Canvas) {
  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data, width: w, height: h } = img
  const flake = Math.max(2, Math.round(Math.max(w, h) / 190))
  const fw = Math.ceil(w / flake)
  const fh = Math.ceil(h / flake)
  const rand = mulberry32(2024)
  const flakeHue = new Float32Array(fw * fh)
  const flakeGlint = new Float32Array(fw * fh)
  for (let i = 0; i < fw * fh; i++) {
    flakeHue[i] = (rand() - 0.5) * 110
    flakeGlint[i] = rand()
  }
  const span = w + h

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      if (data[o + 3] === 0) continue
      const fi = Math.floor(y / flake) * fw + Math.floor(x / flake)
      const glint = flakeGlint[fi]
      const hue =
        ((((x * 0.8 + y) / span) * 720 + flakeHue[fi]) % 360 + 360) % 360
      const [hr, hg, hb] = hslToRgb(hue, 0.9, 0.64)

      const r = data[o]
      const g = data[o + 1]
      const b = data[o + 2]
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

      // Multiply-tint keeps shapes; strength follows the artwork's lightness.
      const m = 0.2 + lum * 0.55
      let nr = r * (1 - m) + ((r * hr) / 255) * 0.35 * m + hr * 0.65 * m
      let ng = g * (1 - m) + ((g * hg) / 255) * 0.35 * m + hg * 0.65 * m
      let nb = b * (1 - m) + ((b * hb) / 255) * 0.35 * m + hb * 0.65 * m

      const shimmer = 0.78 + glint * 0.44
      nr *= shimmer
      ng *= shimmer
      nb *= shimmer

      if (glint > 0.94) {
        const s = ((glint - 0.94) / 0.06) * 0.9
        nr += (255 - nr) * s
        ng += (255 - ng) * s
        nb += (255 - nb) * s
      }

      data[o] = clamp255(nr)
      data[o + 1] = clamp255(ng)
      data[o + 2] = clamp255(nb)
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Smooth holographic foil — same iridescent hue sweep as glitter, but
 * continuous (no flake cells or sparkle pixels).
 */
function hologram(c: Canvas) {
  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data, width: w, height: h } = img
  const span = Math.max(1, w + h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      if (data[o + 3] === 0) continue
      const hue = ((((x * 0.8 + y) / span) * 720) % 360 + 360) % 360
      const [hr, hg, hb] = hslToRgb(hue, 0.9, 0.64)

      const r = data[o]
      const g = data[o + 1]
      const b = data[o + 2]
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

      const m = 0.22 + lum * 0.55
      let nr = r * (1 - m) + ((r * hr) / 255) * 0.35 * m + hr * 0.65 * m
      let ng = g * (1 - m) + ((g * hg) / 255) * 0.35 * m + hg * 0.65 * m
      let nb = b * (1 - m) + ((b * hb) / 255) * 0.35 * m + hb * 0.65 * m

      // Soft continuous sheen (no per-flake flicker).
      const sheen = 0.92 + Math.sin((x + y) * 0.04) * 0.06
      nr *= sheen
      ng *= sheen
      nb *= sheen

      data[o] = clamp255(nr)
      data[o + 1] = clamp255(ng)
      data[o + 2] = clamp255(nb)
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Smooth colour gradation wash (no flakes). Variants sweep different hues
 * across the sticker surface while preserving subject luminance.
 */
function colourGradation(
  c: Canvas,
  variant: "aurora" | "sunset" | "ocean"
) {
  const stops =
    variant === "aurora"
      ? [
          [168, 0.85, 0.58],
          [195, 0.8, 0.56],
          [280, 0.75, 0.58],
          [320, 0.7, 0.6],
        ]
      : variant === "sunset"
        ? [
            [18, 0.92, 0.58],
            [38, 0.9, 0.55],
            [330, 0.78, 0.58],
            [280, 0.7, 0.52],
          ]
        : [
            [195, 0.75, 0.42],
            [175, 0.8, 0.5],
            [210, 0.7, 0.55],
            [230, 0.65, 0.48],
          ]

  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data, width: w, height: h } = img
  const span = Math.max(1, w + h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      if (data[o + 3] === 0) continue
      const t = (x * 0.65 + y * 0.35) / span
      const pos = t * (stops.length - 1)
      const i0 = Math.floor(pos)
      const i1 = Math.min(stops.length - 1, i0 + 1)
      const f = pos - i0
      const [h0, s0, l0] = stops[i0]
      const [h1, s1, l1] = stops[i1]
      // Shortest-path hue lerp
      let dh = h1 - h0
      if (dh > 180) dh -= 360
      if (dh < -180) dh += 360
      const hue = (((h0 + dh * f) % 360) + 360) % 360
      const sat = s0 + (s1 - s0) * f
      const lit = l0 + (l1 - l0) * f
      const [hr, hg, hb] = hslToRgb(hue, sat, lit)

      const r = data[o]
      const g = data[o + 1]
      const b = data[o + 2]
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      const m = 0.28 + lum * 0.48
      data[o] = clamp255(r * (1 - m) + hr * m)
      data[o + 1] = clamp255(g * (1 - m) + hg * m)
      data[o + 2] = clamp255(b * (1 - m) + hb * m)
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Glossy vinyl sheen: soft specular highlights + slight contrast lift so the
 * sticker reads like laminated sticker stock.
 */
function glow(c: Canvas) {
  const ctx = ctx2d(c)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const { data, width: w, height: h } = img
  const cx = w * 0.32
  const cy = h * 0.28
  const radius = Math.hypot(w, h) * 0.55

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      if (data[o + 3] === 0) continue
      let r = data[o]
      let g = data[o + 1]
      let b = data[o + 2]

      // Mild contrast so the vinyl base looks punchier.
      r = (r - 128) * 1.12 + 128
      g = (g - 128) * 1.12 + 128
      b = (b - 128) * 1.12 + 128

      const dist = Math.hypot(x - cx, y - cy) / radius
      const sheen = Math.max(0, 1 - dist)
      const gloss = sheen * sheen * 0.42
      r += (255 - r) * gloss
      g += (255 - g) * gloss
      b += (255 - b) * gloss

      // Secondary rim light from the opposite corner.
      const rim = Math.max(0, (x / w + y / h) * 0.5 - 0.55) * 0.25
      r += (255 - r) * rim
      g += (255 - g) * rim
      b += (255 - b) * rim

      data[o] = clamp255(r)
      data[o + 1] = clamp255(g)
      data[o + 2] = clamp255(b)
    }
  }
  ctx.putImageData(img, 0, 0)
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export async function renderSticker(
  source: string,
  options: RenderOptions
): Promise<string> {
  const maxSide = options.maxSide ?? BASELINE
  const subject = await prepareSubject(source, maxSide)
  const t = options.outlineThickness * (maxSide / BASELINE)
  const color = options.outlineColor

  const composed =
    options.style === "none"
      ? composeNone(subject)
      : options.style === "square"
        ? composeSquare(subject, t, color)
        : options.style === "rounded"
          ? composeRounded(subject, t, color)
          : options.style === "circle"
            ? composeCircle(subject, t, color)
            : options.style === "stamp"
              ? composeStamp(subject, t, color)
              : options.style === "rough"
                ? composeRough(subject, t, color)
                : composeClassic(subject, t, color)

  const { base } = composed
  const hairPad = options.style === "none" ? 0 : 2
  const out = makeCanvas(base.width + hairPad * 2, base.height + hairPad * 2)
  const ctx = ctx2d(out)

  if (options.style === "none") {
    // Soft cut line from the subject alpha so light stickers stay legible.
    const mask = dilate(subject, 0, 2)
    const hair = tint(mask, "rgba(0,0,0,0.08)")
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      ctx.drawImage(hair, composed.subjectX - 2 + dx, composed.subjectY - 2 + dy)
    }
    ctx.drawImage(subject, composed.subjectX, composed.subjectY)
  } else {
    // A faint cut line keeps light-coloured stickers legible on white.
    const hair = tint(base, "rgba(0,0,0,0.09)")
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      ctx.drawImage(hair, hairPad + dx, hairPad + dy)
    }
    ctx.drawImage(base, hairPad, hairPad)
    if (!composed.baked) {
      ctx.drawImage(
        subject,
        hairPad + composed.subjectX,
        hairPad + composed.subjectY
      )
    }
  }

  toneFilter(out, options.filter)
  if (options.filter === "glitter") glitter(out)
  if (options.filter === "hologram") hologram(out)
  if (
    options.filter === "aurora" ||
    options.filter === "sunset" ||
    options.filter === "ocean"
  ) {
    colourGradation(out, options.filter)
  }
  if (options.filter === "glow") glow(out)

  return out.toDataURL("image/png")
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}
