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
/* Subject preparation: scale, auto background removal, trim          */
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

/** Flood-fills the backdrop from the image border; returns removed fraction. */
function removeBackground(img: ImageData): number {
  const { data, width: w, height: h } = img
  const sample = (x0: number, y0: number) => {
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (let y = y0; y < Math.min(h, y0 + 4); y++) {
      for (let x = x0; x < Math.min(w, x0 + 4); x++) {
        const o = (y * w + x) * 4
        r += data[o]
        g += data[o + 1]
        b += data[o + 2]
        n++
      }
    }
    return [r / n, g / n, b / n] as const
  }
  const corners = [
    sample(0, 0),
    sample(Math.max(0, w - 4), 0),
    sample(0, Math.max(0, h - 4)),
    sample(Math.max(0, w - 4), Math.max(0, h - 4)),
  ]
  const bg = [0, 1, 2].map(
    (i) => corners.reduce((s, c) => s + c[i], 0) / corners.length
  )

  const tol = 42
  const tol2 = tol * tol
  const dist2 = (i: number) => {
    const o = i * 4
    const dr = data[o] - bg[0]
    const dg = data[o + 1] - bg[1]
    const db = data[o + 2] - bg[2]
    return dr * dr + dg * dg + db * db
  }

  const removed = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let sp = 0
  const seed = (i: number) => {
    if (removed[i]) return
    if (data[i * 4 + 3] < 20 || dist2(i) <= tol2) {
      removed[i] = 1
      stack[sp++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x)
    seed((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    seed(y * w)
    seed(y * w + w - 1)
  }
  while (sp > 0) {
    const i = stack[--sp]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (y > 0) seed(i - w)
    if (y < h - 1) seed(i + w)
  }

  let count = 0
  for (let i = 0; i < w * h; i++) {
    if (removed[i]) {
      data[i * 4 + 3] = 0
      count++
    }
  }

  // Feather the cut so the subject edge doesn't look aliased.
  const soft = tol * 1.9
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (removed[i]) continue
      if (
        removed[i - 1] ||
        removed[i + 1] ||
        removed[i - w] ||
        removed[i + w]
      ) {
        const d = Math.sqrt(dist2(i))
        if (d < soft) {
          const a = Math.max(0, Math.min(1, (d - tol) / (soft - tol)))
          data[i * 4 + 3] = Math.round(data[i * 4 + 3] * (0.35 + 0.65 * a))
        }
      }
    }
  }

  return count / (w * h)
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

function roundedClip(src: Canvas): Canvas {
  const out = makeCanvas(src.width, src.height)
  const ctx = ctx2d(out)
  const r = Math.min(src.width, src.height) * 0.08
  ctx.beginPath()
  ctx.roundRect(0, 0, src.width, src.height, r)
  ctx.clip()
  ctx.drawImage(src, 0, 0)
  return out
}

const subjectCache = new Map<string, Promise<Canvas>>()

function prepareSubject(source: string, maxSide: number): Promise<Canvas> {
  const key = `${maxSide}|${source}`
  const hit = subjectCache.get(key)
  if (hit) return hit

  const job = loadImage(source).then((img) => {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const c = makeCanvas(img.width * scale, img.height * scale)
    const ctx = ctx2d(c)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const data = ctx.getImageData(0, 0, c.width, c.height)

    if (hasTransparentBorder(data.data, c.width, c.height)) {
      return trim(c)
    }
    const removed = removeBackground(data)
    ctx.putImageData(data, 0, 0)
    // Photos with busy backgrounds keep their frame as a rounded tile.
    return removed < 0.02 ? roundedClip(c) : trim(c)
  })

  subjectCache.set(key, job)
  if (subjectCache.size > 12) {
    const first = subjectCache.keys().next().value
    if (first) subjectCache.delete(first)
  }
  return job
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

type Composed = { base: Canvas; subjectX: number; subjectY: number }

function composeClassic(subject: Canvas, t: number, color: string): Composed {
  const r = Math.max(2, t)
  const pad = Math.ceil(r + 4)
  const base = tint(dilate(subject, r, pad), color)
  return { base, subjectX: pad, subjectY: pad }
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
  if (filter === "original" || filter === "glitter") return
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

  const composed =
    options.style === "stamp"
      ? composeStamp(subject, t, options.outlineColor)
      : options.style === "rough"
        ? composeRough(subject, t, options.outlineColor)
        : composeClassic(subject, t, options.outlineColor)

  const { base } = composed
  const hairPad = 2
  const out = makeCanvas(base.width + hairPad * 2, base.height + hairPad * 2)
  const ctx = ctx2d(out)

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
  ctx.drawImage(
    subject,
    hairPad + composed.subjectX,
    hairPad + composed.subjectY
  )

  toneFilter(out, options.filter)
  if (options.filter === "glitter") glitter(out)

  return out.toDataURL("image/png")
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}
