/**
 * 5s thermal sticker print scene — all drawing lives in drawFrame(t).
 * Canvas logical size: 1080×1350 (4:5). Transparent — no surface fill.
 */

import { renderSticker } from "@/lib/sticker-process"

export const PRINT_W = 1080
export const PRINT_H = 1350
export const PRINT_LOOP_S = 5

type DrawCtx = {
  ctx: CanvasRenderingContext2D
  /** Classic die-cut sticker (object silhouette + white border). */
  sticker: HTMLCanvasElement | null
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** Stepper-style feed: slow crawl with brief pauses. */
function stepperFeed(u: number) {
  const steps = 12
  const s = u * steps
  const i = Math.floor(s)
  const f = s - i
  const local = f < 0.18 ? 0 : easeInOut((f - 0.18) / 0.82)
  return (i + local) / steps
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}

/** Light thermal texture while preserving classic die-cut alpha. */
function applyThermal(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const ink = ctx.getImageData(0, 0, c.width, c.height)
  const ir = mulberry32(0xa11ce)
  const { width: w, height: h, data } = ink
  for (let y = 0; y < h; y++) {
    const streak = (ir() - 0.5) * 5
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 8) continue
      const dens = 0.94 + ir() * 0.08
      let r = data[i] * dens + streak * 0.12
      let g = data[i + 1] * dens + streak * 0.12
      let b = data[i + 2] * dens + streak * 0.1
      if ((x + y) % 2 === 0) {
        r *= 0.99
        g *= 0.99
        b *= 0.99
      }
      if (ir() > 0.998) {
        r = lerp(r, 247, 0.55)
        g = lerp(g, 246, 0.55)
        b = lerp(b, 242, 0.55)
      }
      data[i] = clamp(r, 0, 255)
      data[i + 1] = clamp(g, 0, 255)
      data[i + 2] = clamp(b, 0, 255)
    }
  }
  ctx.putImageData(ink, 0, 0)
  return c
}

/**
 * Classic sticker: white outline follows the object silhouette
 * (transparent PNG cutout) or the trimmed subject bounds.
 */
export async function buildClassicSticker(
  source: string
): Promise<HTMLCanvasElement> {
  const url = await renderSticker(source, {
    style: "classic",
    filter: "original",
    outlineColor: "#FFFFFF",
    outlineThickness: 18,
    maxSide: 520,
  })
  const img = await loadImage(url)
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext("2d")!
  ctx.drawImage(img, 0, 0)
  return applyThermal(c)
}

/**
 * Printer body with a wide output slot — always larger than the sticker.
 */
function drawPrinter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  vibrateX: number,
  vibrateY: number
) {
  const w = 760
  const h = 240
  const x = cx - w / 2 + vibrateX
  const y = topY + vibrateY

  ctx.save()
  ctx.fillStyle = "rgba(40,36,30,0.16)"
  ctx.beginPath()
  ctx.ellipse(cx + vibrateX, y + h + 10, w * 0.46, 16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const body = ctx.createLinearGradient(x, y, x, y + h)
  body.addColorStop(0, "#3a3a3c")
  body.addColorStop(0.1, "#2c2c2e")
  body.addColorStop(0.7, "#1f1f21")
  body.addColorStop(1, "#171719")
  roundRect(ctx, x, y, w, h, 26)
  ctx.fillStyle = body
  ctx.fill()

  roundRect(ctx, x + 3, y + 3, w - 6, 12, 10)
  ctx.fillStyle = "rgba(255,255,255,0.14)"
  ctx.fill()

  // Wide slot so the sticker clearly fits inside the machine.
  const slotX = x + 90
  const slotW = w - 180
  const slotH = 20
  const slotY = y + h - 42
  roundRect(ctx, slotX, slotY, slotW, slotH, 5)
  ctx.fillStyle = "#0c0c0d"
  ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.06)"
  ctx.fillRect(slotX + 6, slotY + 3, slotW - 12, 2)

  ctx.save()
  ctx.translate(slotX, slotY + slotH + 1)
  ctx.fillStyle = "#4a4a4c"
  const teeth = 56
  const tw = slotW / teeth
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(i * tw + tw * 0.5, 6)
    ctx.lineTo((i + 1) * tw, 0)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = "rgba(255,255,255,0.05)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 32, y + 64)
  ctx.lineTo(x + w - 32, y + 64)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x + w - 52, y + 112, 6, 0, Math.PI * 2)
  ctx.fillStyle = "#3DDC84"
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w - 52, y + 112, 2.4, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(255,255,255,0.45)"
  ctx.fill()

  roundRect(ctx, cx - 34 + vibrateX, y + 150, 68, 9, 4)
  ctx.fillStyle = "rgba(255,255,255,0.06)"
  ctx.fill()

  return { slotX, slotY, slotW, slotH, x, y, w, h }
}

/**
 * Core animation. `t` is elapsed seconds (caller wraps with `% PRINT_LOOP_S`).
 */
export function drawFrame(t: number, state: DrawCtx) {
  const { ctx, sticker } = state
  const W = PRINT_W
  const H = PRINT_H

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)

  const printStart = 0.25
  const printEnd = 4.1
  const finishNudge = 4.3
  const pullBack = 4.5

  let feed = 0
  if (t < printStart) {
    feed = lerp(0, 0.04, easeInOut(t / printStart))
  } else if (t < printEnd) {
    const u = (t - printStart) / (printEnd - printStart)
    feed = lerp(0.04, 1, stepperFeed(u))
  } else if (t < finishNudge) {
    feed = 1
  } else if (t < pullBack) {
    // Extra push so the sticker clears the tear bar a little.
    feed = lerp(1, 1.06, easeInOut((t - finishNudge) / (pullBack - finishNudge)))
  } else {
    feed = 1.06
  }

  let cam = 1
  if (t < printEnd) {
    cam = lerp(1, 1.03, easeInOut(clamp(t / printEnd, 0, 1)))
  } else if (t < pullBack) {
    cam = 1.03
  } else {
    cam = lerp(
      1.03,
      1,
      easeInOut(clamp((t - pullBack) / (PRINT_LOOP_S - pullBack), 0, 1))
    )
  }

  const feeding = t >= printStart && t < printEnd
  const finishing = t >= finishNudge && t < pullBack
  const vibAmp = feeding ? 0.7 : finishing ? 0.45 : 0
  const vibrateX = Math.sin(t * 58) * vibAmp * 0.4
  const vibrateY = Math.sin(t * 73 + 1.1) * vibAmp

  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.scale(cam, cam)
  ctx.translate(-W / 2, -H / 2)

  const printerTop = 56
  const cx = W / 2
  const printer = drawPrinter(ctx, cx, printerTop, vibrateX, vibrateY)
  const slotBottom = printer.slotY + printer.slotH + vibrateY

  const stickerW = sticker?.width ?? 320
  const stickerH = sticker?.height ?? 320
  // Match the printer hole width (tiny inset so edges clear the slot).
  const maxW = printer.slotW * 0.98
  const maxH = Math.max(280, H - slotBottom - 48)
  const scale = Math.min(1, maxW / stickerW, maxH / Math.max(1, stickerH))
  const dw = stickerW * scale
  const dh = stickerH * scale

  // Physical feed: the whole sticker translates down.
  // feed=0 → mostly hidden above the slot; feed=1 → fully clear of the slot.
  const travel = dh + 18
  const stickerTop = slotBottom - dh + feed * travel
  const stickerLeft = cx - dw / 2 + vibrateX * 0.2

  // Hide anything still “inside” the printer (above the slot lip).
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, slotBottom, W, H - slotBottom)
  ctx.clip()

  if (sticker) {
    if (feeding) {
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.1 / i
        ctx.drawImage(sticker, stickerLeft, stickerTop - i * 3.2, dw, dh)
      }
      ctx.globalAlpha = 1
    }

    // Soft contact shadow behind the die-cut (not a floor ellipse).
    ctx.save()
    ctx.shadowColor = "rgba(40, 36, 30, 0.28)"
    ctx.shadowBlur = 18
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 10
    ctx.drawImage(sticker, stickerLeft, stickerTop, dw, dh)
    ctx.restore()
  }
  ctx.restore()

  // Slot + tear bar drawn on top so paper reads as exiting the machine.
  ctx.save()
  const slotX = printer.slotX + vibrateX
  const slotY = printer.slotY + vibrateY
  roundRect(ctx, slotX, slotY, printer.slotW, printer.slotH, 5)
  ctx.fillStyle = "#0c0c0d"
  ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.06)"
  ctx.fillRect(slotX + 6, slotY + 3, printer.slotW - 12, 2)

  ctx.translate(slotX, slotY + printer.slotH + 1)
  ctx.fillStyle = "#4a4a4c"
  const teeth = 56
  const tw = printer.slotW / teeth
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(i * tw + tw * 0.5, 6)
    ctx.lineTo((i + 1) * tw, 0)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.restore()
}

export type PrintSceneHandle = {
  setImageSrc: (src: string | null) => Promise<void>
  drawFrame: (t: number) => void
}

export function createPrintScene(
  ctx: CanvasRenderingContext2D
): PrintSceneHandle {
  const state: DrawCtx = { ctx, sticker: null }
  let gen = 0

  return {
    async setImageSrc(src) {
      const id = ++gen
      if (!src) {
        state.sticker = null
        return
      }
      try {
        const sticker = await buildClassicSticker(src)
        if (id !== gen) return
        state.sticker = sticker
      } catch {
        if (id !== gen) return
        state.sticker = null
      }
    },
    drawFrame(t) {
      drawFrame(t, state)
    },
  }
}
