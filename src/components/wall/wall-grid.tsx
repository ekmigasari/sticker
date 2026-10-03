import { useLayoutEffect, useRef } from "react"
import { UNIT_SCALE, WALL_UNITS } from "@/domain/types"

/** Grid levels in wall units; each fades in as its cells grow on screen. */
const GRID_LEVELS = [1, 10, 100] as const
const FADE_START_PX = 6
const FADE_FULL_PX = 24
const LINE_ALPHA = 0.07

function levelAlpha(cellPx: number) {
  const t = Math.min(
    1,
    Math.max(0, (cellPx - FADE_START_PX) / (FADE_FULL_PX - FADE_START_PX))
  )
  return LINE_ALPHA * t * t * (3 - 2 * t)
}

/**
 * Screen-space wall grid on a viewport-sized canvas. Every line is placed
 * once on a whole device pixel and carries the summed strength of all levels
 * through it, so levels never drift apart into double lines at odd zooms.
 */
export function WallGrid({
  camera,
  viewportW,
  viewportH,
}: {
  camera: { x: number; y: number; zoom: number }
  viewportW: number
  viewportH: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const devW = Math.round(viewportW * dpr)
    const devH = Math.round(viewportH * dpr)
    if (canvas.width !== devW) canvas.width = devW
    if (canvas.height !== devH) canvas.height = devH
    ctx.clearRect(0, 0, devW, devH)

    const pxPerUnit = camera.zoom * UNIT_SCALE
    const levels = GRID_LEVELS.map((level) => ({
      level,
      alpha: levelAlpha(level * pxPerUnit),
    })).filter((l) => l.alpha >= 0.004)
    if (levels.length === 0) return

    const step = levels[0].level
    const stepPx = step * pxPerUnit
    const lineW = Math.max(1, Math.round(dpr))
    const originX = viewportW / 2 - camera.x * camera.zoom
    const originY = viewportH / 2 - camera.y * camera.zoom
    const maxK = WALL_UNITS / step

    const drawAxis = (origin: number, extent: number, vertical: boolean) => {
      const first = Math.max(0, Math.ceil(-origin / stepPx))
      const last = Math.min(maxK, Math.floor((extent - origin) / stepPx))
      for (let k = first; k <= last; k++) {
        const units = k * step
        let alpha = 0
        for (const l of levels) if (units % l.level === 0) alpha += l.alpha
        const pos = Math.round((origin + k * stepPx) * dpr)
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`
        if (vertical) ctx.fillRect(pos, 0, lineW, devH)
        else ctx.fillRect(0, pos, devW, lineW)
      }
    }
    drawAxis(originX, viewportW, true)
    drawAxis(originY, viewportH, false)
  }, [camera.x, camera.y, camera.zoom, viewportW, viewportH])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
    />
  )
}
