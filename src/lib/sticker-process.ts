export type ProcessOptions = {
  outlineColor: string
  outlineThickness: number
  shadow: boolean
  /** When true, treat near-white / light bg as transparent. */
  punchLightBackground: boolean
  watermark: boolean
  /** Solid backdrop behind sticker (wall preview uses none). */
  solidBackground?: string | null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}

function punchLightPixels(imageData: ImageData) {
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 16) {
      data[i + 3] = 0
      continue
    }
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lightness = (max + min) / 2
    const sat = max - min
    if (lightness > 245 && sat < 18) data[i + 3] = 0
  }
}

/**
 * Classic sticker: cutout + colored outline (+ optional shadow / watermark).
 * Outline uses a silhouette + blur expand for interactive performance.
 */
export async function renderClassicSticker(
  sourceDataUrl: string,
  options: ProcessOptions
): Promise<string> {
  const img = await loadImage(sourceDataUrl)
  const maxSide = 512
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const iw = Math.max(1, Math.round(img.width * scale))
  const ih = Math.max(1, Math.round(img.height * scale))

  const pad = Math.ceil(options.outlineThickness * 1.6 + (options.shadow ? 18 : 10))
  const cw = iw + pad * 2
  const ch = ih + pad * 2

  const src = document.createElement("canvas")
  src.width = iw
  src.height = ih
  const sctx = src.getContext("2d", { willReadFrequently: true })
  if (!sctx) throw new Error("Canvas unsupported")
  sctx.drawImage(img, 0, 0, iw, ih)
  if (options.punchLightBackground) {
    const imageData = sctx.getImageData(0, 0, iw, ih)
    punchLightPixels(imageData)
    sctx.putImageData(imageData, 0, 0)
  }

  // Silhouette in outline color
  const sil = document.createElement("canvas")
  sil.width = iw
  sil.height = ih
  const silCtx = sil.getContext("2d")
  if (!silCtx) throw new Error("Canvas unsupported")
  silCtx.drawImage(src, 0, 0)
  silCtx.globalCompositeOperation = "source-in"
  silCtx.fillStyle = options.outlineColor
  silCtx.fillRect(0, 0, iw, ih)

  const out = document.createElement("canvas")
  out.width = cw
  out.height = ch
  const ctx = out.getContext("2d")
  if (!ctx) throw new Error("Canvas unsupported")

  if (options.solidBackground) {
    ctx.fillStyle = options.solidBackground
    ctx.fillRect(0, 0, cw, ch)
  }

  if (options.shadow) {
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.35)"
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 8
  }

  // Expand silhouette into an outline ring
  ctx.save()
  ctx.filter = `blur(${Math.max(0.5, options.outlineThickness * 0.45)}px)`
  const steps = 16
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2
    const dx = Math.cos(ang) * options.outlineThickness
    const dy = Math.sin(ang) * options.outlineThickness
    ctx.drawImage(sil, pad + dx, pad + dy)
  }
  ctx.filter = "none"
  ctx.restore()

  ctx.drawImage(src, pad, pad)

  if (options.shadow) ctx.restore()

  if (options.watermark) {
    ctx.save()
    ctx.font = "600 11px 'DM Sans Variable', system-ui, sans-serif"
    ctx.fillStyle = "rgba(0,0,0,0.45)"
    ctx.textAlign = "right"
    ctx.fillText("Made on Sticker Wall", cw - 10, ch - 10)
    ctx.restore()
  }

  return out.toDataURL("image/png")
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}
