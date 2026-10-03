/** Generate colorful placeholder sticker PNGs (data URLs) for the seeded wall. */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function makeSeedStickerDataUrl(opts: {
  label: string
  fill: string
  accent: string
  size?: number
}): string {
  const size = opts.size ?? 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  const pad = 18
  // White sticker die-cut with thick outline
  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.28)"
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 6
  ctx.fillStyle = "#fffef8"
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, 36)
  ctx.fill()
  ctx.restore()

  ctx.lineWidth = 10
  ctx.strokeStyle = opts.accent
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, 36)
  ctx.stroke()

  // Inner blob
  ctx.fillStyle = opts.fill
  roundRect(
    ctx,
    pad + 28,
    pad + 28,
    size - (pad + 28) * 2,
    size - (pad + 28) * 2 - 40,
    28
  )
  ctx.fill()

  // Label
  ctx.fillStyle = "#1a1a1a"
  ctx.font = `800 ${Math.floor(size * 0.11)}px Nunito, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const words = opts.label.split(" ")
  const line = words.length > 2 ? `${words[0]} ${words[1]}` : opts.label
  ctx.fillText(line, size / 2, size - pad - 28, size - pad * 2 - 16)

  return canvas.toDataURL("image/png")
}

export const SEED_PALETTE = [
  { fill: "#2dd4bf", accent: "#0f766e" },
  { fill: "#fbbf24", accent: "#b45309" },
  { fill: "#fb7185", accent: "#be123c" },
  { fill: "#60a5fa", accent: "#1d4ed8" },
  { fill: "#a3e635", accent: "#3f6212" },
  { fill: "#c084fc", accent: "#6b21a8" },
  { fill: "#fdba74", accent: "#c2410c" },
  { fill: "#67e8f9", accent: "#0e7490" },
] as const
